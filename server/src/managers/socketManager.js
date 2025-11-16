import { preWarmConnection } from '../services/databricksService.js';
import { DateUtils } from '../utils/dateUtils.js';

export class SocketManager {
  constructor(io, appState, pollingManager, eventStreamManager, CONFIG) {
    this.io = io;
    this.appState = appState;
    this.pollingManager = pollingManager;
    this.eventStreamManager = eventStreamManager;
    this.CONFIG = CONFIG;
  }

  handleConnection(socket) {
    console.log("\n Client connected:", socket.id);
    this.appState.connectedClients.set(socket.id, {
      id: socket.id,
      tab: "dashboard",
    });

    this.updateActiveTabs();

    this.sendConnectionInfo(socket);
    this.setupSocketHandlers(socket);

    if (this.appState.connectedClients.size === 1) {
      this.pollingManager.startAutoPolling();
      this.eventStreamManager.startEventStreamPolling();

      setTimeout(() => {
        this.pollingManager.pollDatabricks();
        this.eventStreamManager.refreshEventStreamImmediately();
      }, 1000);
    } else {
      setTimeout(() => {
        this.eventStreamManager.refreshEventStreamImmediately();
      }, 500);
    }
  }

  updateActiveTabs() {
    const activeTabs = new Set();
    this.appState.connectedClients.forEach((client) => {
      if (client.tab) {
        activeTabs.add(client.tab);
      }
    });
    this.appState.activeTabs = activeTabs;
  }

  sendConnectionInfo(socket) {
    socket.emit("connection-info", {
      id: socket.id,
      currentDate: this.appState.currentDate,
      mainDataPollInterval: this.CONFIG.MAIN_DATA_POLL_INTERVAL,
      eventStreamPollInterval: this.CONFIG.EVENT_STREAM_POLL_INTERVAL,
      isPolling: this.appState.isPolling,
      isEventStreamPolling: this.appState.isEventStreamPolling,
      serverTime: new Date().toISOString(),
    });
  }

  setupSocketHandlers(socket) {
    socket.on("change-date", (data) => this.handleDateChange(socket, data));
    socket.on("refresh-data", () => this.handleRefreshData(socket));
    socket.on("refresh-event-stream", () => this.handleRefreshEventStream(socket));
    socket.on("request-tab-data", (data) => this.handleTabDataRequest(socket, data));
    socket.on("tab-changed", (data) => this.handleTabChanged(socket, data));
    socket.on("pre-warm", () => this.handlePreWarm(socket));
    socket.on("disconnect", (reason) => this.handleDisconnect(socket, reason));
  }

  handleTabChanged(socket, { tab }) {
    console.log(`-----> Client ${socket.id} switched to tab: ${tab}`);
    const clientInfo = this.appState.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.tab = tab;
      this.appState.connectedClients.set(socket.id, clientInfo);
      this.updateActiveTabs();
    }

    if (tab === "dashboard") {
      if (this.appState.latestData) {
        socket.emit("databricks-data", {
          data: this.appState.latestData,
          date: this.appState.currentDate,
          timestamp: new Date().toISOString(),
          source: "cache",
          updateType: "full",
          refreshType: "main-data",
        });
      } else {
        this.pollingManager.pollDatabricks();
      }
    } else if (tab === "event-stream") {
      this.eventStreamManager.refreshEventStreamImmediately();
    }
  }

  async handleDateChange(socket, { date }) {
    console.log("\n Live data date change requested:", date);

    if (!DateUtils.isValidDate(date)) {
      socket.emit("databricks-error", {
        message: "Invalid date format. Use YYYY-MM-DD",
      });
      return;
    }

    this.appState.currentDate = date;
    this.eventStreamManager.resetEventTracking();

    this.io.emit("date-changed", {
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
    });

    await this.pollingManager.pollDatabricks();
  }

  async handleRefreshData(socket) {
    console.log("\n Manual refresh requested by:", socket.id);
    await this.pollingManager.pollDatabricks();
  }

  async handleRefreshEventStream(socket) {
    console.log("\n Manual event stream refresh requested by:", socket.id);
    await this.eventStreamManager.refreshEventStreamImmediately();
  }

  handleTabDataRequest(socket, { tabType }) {
    console.log(`-------> Tab data request for: ${tabType} from client ${socket.id}`);
    const clientInfo = this.appState.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.tab = tabType;
      this.appState.connectedClients.set(socket.id, clientInfo);
      this.updateActiveTabs();
    }

    if (tabType === "dashboard") {
      if (this.appState.latestData) {
        socket.emit("databricks-data", {
          data: this.appState.latestData,
          date: this.appState.currentDate,
          timestamp: new Date().toISOString(),
          source: "cache",
          updateType: "full",
          refreshType: "main-data",
        });
      }
    } else if (tabType === "event-stream") {
      this.eventStreamManager.refreshEventStreamImmediately();
    }
  }

  async handlePreWarm(socket) {
    console.log("\n Pre-warm requested by:", socket.id);
    try {
      await preWarmConnection();
      socket.emit("pre-warm-complete", { timestamp: new Date().toISOString() });
    } catch (error) {
      socket.emit("databricks-error", { message: error.message });
    }
  }

  handleDisconnect(socket, reason) {
    console.log("\n Client disconnected:", socket.id, "Reason:", reason);
    this.appState.connectedClients.delete(socket.id);
    this.updateActiveTabs();

    if (this.appState.connectedClients.size === 0) {
      this.pollingManager.stopAutoPolling();
      this.eventStreamManager.stopEventStreamPolling();
    }
  }
}