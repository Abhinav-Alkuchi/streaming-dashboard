import { fetchLatestDataWithDate } from '../services/databricksService.js';

export class PollingManager {
  constructor(io, appState, CONFIG) {
    this.io = io;
    this.appState = appState;
    this.CONFIG = CONFIG;
  }

  async pollDatabricks() {
    if (this.appState.isPolling) {
      return;
    }

    this.appState.isPolling = true;

    this.io.emit("query-started", {
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
      type: "main-data",
    });

    try {
      const startTime = Date.now();
      const data = await fetchLatestDataWithDate(this.appState.currentDate, true);
      const queryTime = Date.now() - startTime;

      await this.handlePollingSuccess(data, queryTime);
    } catch (error) {
      await this.handlePollingError(error);
    } finally {
      this.appState.isPolling = false;
    }
  }

  async handlePollingSuccess(data, queryTime) {
    if (data && data.length > 0) {
      const dataChanged =
        JSON.stringify(data) !== JSON.stringify(this.appState.latestData);

      if (dataChanged) {
        this.appState.latestData = data;
        this.broadcastDataToClients(data, queryTime);
      }
    } else {
      this.appState.latestData = [];
      this.broadcastEmptyData(queryTime);
    }
  }

  broadcastDataToClients(data, queryTime) {
    this.io.emit("databricks-data", {
      data: data,
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
      queryTime: queryTime,
      recordCount: data.length,
      source: "live",
      isAutoRefresh: true,
      updateType: "full",
      refreshType: "main-data",
    });
  }

  broadcastEmptyData(queryTime) {
    this.io.emit("databricks-data", {
      data: [],
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
      queryTime: queryTime,
      recordCount: 0,
      source: "live",
      isAutoRefresh: true,
      updateType: "full",
      refreshType: "main-data",
    });
  }

  async handlePollingError(error) {
    console.error("MAIN DATA polling error:", error.message);
    this.io.emit("databricks-error", {
      message: error.message,
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
      error: error.toString(),
      isAutoRefresh: true,
      refreshType: "main-data",
    });
  }

  startAutoPolling() {
    if (this.appState.pollTimer) {
      clearInterval(this.appState.pollTimer);
    }

    this.appState.pollTimer = setInterval(async () => {
      if (this.appState.activeTabs.has("dashboard")) {
        await this.pollDatabricks();
      }
    }, this.CONFIG.MAIN_DATA_POLL_INTERVAL);
  }

  stopAutoPolling() {
    if (this.appState.pollTimer) {
      clearInterval(this.appState.pollTimer);
      this.appState.pollTimer = null;
    }
  }
}