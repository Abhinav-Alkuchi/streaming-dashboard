/* eslint-disable @typescript-eslint/no-explicit-any */
import io, { Socket } from "socket.io-client";
import type { ConnectionStats } from "../types";
import {
  SocketEvents,
  type SocketEventHandlers,
  type TabType,
  type SocketConfig,
  type SocketMetrics,
  type SocketState,
} from "./SocketTypes";

// Default constants
const DEFAULT_SOCKET_TIMEOUT = 10000;
const DEFAULT_RECONNECTION_ATTEMPTS = 5;
const DEFAULT_RECONNECTION_DELAY = 1000;

class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private handlers: SocketEventHandlers = {};
  private state: SocketState = {
    isConnected: false,
    currentTab: "dashboard",
    reconnectAttempts: 0,
    lastError: null,
  };
  private metrics: SocketMetrics = {
    totalConnections: 0,
    totalDisconnections: 0,
    totalErrors: 0,
    uptime: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  };

  constructor(config: SocketConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
      timeout: config.timeout || DEFAULT_SOCKET_TIMEOUT,
      reconnectionAttempts: config.reconnectionAttempts || DEFAULT_RECONNECTION_ATTEMPTS,
      reconnectionDelay: config.reconnectionDelay || DEFAULT_RECONNECTION_DELAY,
      autoConnect: config.autoConnect ?? true,
    };
  }

  /**
   * Initialize socket connection with event handlers
   */
  public initialize(handlers: SocketEventHandlers): void {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    this.handlers = handlers;

    if (!this.socket) {
      console.log("🔌 Initializing WebSocket connection:", this.config.baseUrl);

      this.socket = io(this.config.baseUrl!, {
        transports: ["websocket", "polling"],
        timeout: this.config.timeout,
        reconnection: true,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        autoConnect: this.config.autoConnect,
      });

      this.attachEventListeners();
    }

    if (this.socket.connected && handlers.onConnect) {
      handlers.onConnect();
    }
  }

  /**
   * Attach all socket event listeners
   */
  private attachEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on(SocketEvents.CONNECT, () => {
      console.log("Connected to Databricks server");
      this.state.isConnected = true;
      this.state.reconnectAttempts = 0;
      this.state.lastError = null;
      this.metrics.totalConnections++;
      this.metrics.lastConnectedAt = new Date();
      this.handlers.onConnect?.();
    });

    this.socket.on(SocketEvents.DISCONNECT, (reason: string) => {
      console.log("🔌 Disconnected from server:", reason);
      this.state.isConnected = false;
      this.metrics.totalDisconnections++;
      this.metrics.lastDisconnectedAt = new Date();
      this.handlers.onDisconnect?.(reason);

      if (reason === "io server disconnect") {
        console.log("🔄 Server initiated disconnect - attempting to reconnect...");
        this.socket?.connect();
      }
    });

    this.socket.on(SocketEvents.CONNECT_ERROR, (error) => {
      console.error("❌ Socket connection error:", error);
      this.state.isConnected = false;
      this.state.reconnectAttempts++;
      this.state.lastError = error.message;
      this.metrics.totalErrors++;
      this.handlers.onConnectError?.(error);
    });

    // Data events with tab-specific filtering
    this.socket.on(SocketEvents.DATABRICKS_DATA, (newData: any) => {
      if (this.state.currentTab === "dashboard") {
        console.log("📥 Received dashboard data (60s interval)");
        this.handlers.onDatabricksData?.(newData);
      } else {
        console.log("📥 Ignoring dashboard data - not on dashboard tab");
      }
    });

    this.socket.on(SocketEvents.EVENT_STREAM_DATA, (newData: any) => {
      if (this.state.currentTab === "event-stream") {
        console.log("📥 Received event stream data (5s interval)");
        this.handlers.onEventStreamData?.(newData);
      } else {
        console.log("📥 Ignoring event stream data - not on event-stream tab");
      }
    });

    // Error and info events
    this.socket.on(SocketEvents.DATABRICKS_ERROR, (errorData: { message: string }) => {
      console.error("❌ Server error:", errorData);
      this.state.lastError = errorData.message;
      this.metrics.totalErrors++;
      this.handlers.onError?.(errorData);
    });

    this.socket.on(SocketEvents.CONNECTION_INFO, (info: any) => {
      console.log("ℹ️ Connection info:", info);
      this.handlers.onConnectionInfo?.(info);
    });

    this.socket.on(SocketEvents.DATE_CHANGED, (data: { date: string }) => {
      console.log("📅 Date changed to:", data.date);
      this.handlers.onDateChanged?.(data);
    });

    this.socket.on(SocketEvents.SERVER_STATS, (stats: ConnectionStats) => {
      this.handlers.onServerStats?.(stats);
    });

    this.socket.on(SocketEvents.QUERY_STARTED, (data: any) => {
      console.log("🔄 Query started:", data);
      this.handlers.onQueryStarted?.(data);
    });
  }

  /**
   * Connect the socket
   */
  public connect(): void {
    if (!this.socket) {
      console.error("❌ Socket not initialized. Call initialize() first.");
      return;
    }

    if (this.socket.connected) {
      console.log("Socket already connected");
      return;
    }

    console.log("🔌 Connecting socket...");
    this.socket.connect();
  }

  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    if (this.socket?.connected) {
      console.log("🔌 Disconnecting socket...");
      this.socket.disconnect();
    }
  }

  /**
   * Emit an event to the server
   */
  public emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn(`⚠️ Cannot emit '${event}' - socket not connected`);
      return;
    }

    console.log(`📤 Emitting '${event}'`, data ? `with data` : "");
    this.socket.emit(event, data);
  }

  /**
   * Request data for a specific tab
   */
  public requestTabData(tab: TabType): void {
    if (!this.socket?.connected) {
      console.warn("⚠️ Cannot request tab data - socket not connected");
      return;
    }

    console.log(`📡 Requesting data for ${tab} tab`);
    this.emit(SocketEvents.REQUEST_TAB_DATA, { tabType: tab });

    // Trigger appropriate refresh based on tab
    if (tab === "dashboard") {
      this.emit(SocketEvents.REFRESH_DATA);
    } else if (tab === "event-stream") {
      this.emit(SocketEvents.REFRESH_EVENT_STREAM);
    }
  }

  /**
   * Refresh main dashboard data
   */
  public refreshDashboard(): void {
    this.emit(SocketEvents.REFRESH_DATA);
  }

  /**
   * Refresh event stream data
   */
  public refreshEventStream(): void {
    this.emit(SocketEvents.REFRESH_EVENT_STREAM);
  }

  /**
   * Change the selected date
   */
  public changeDate(date: string): void {
    this.emit(SocketEvents.CHANGE_DATE, { date });
  }

  /**
   * Notify server of tab change
   */
  public changeTab(tab: TabType): void {
    this.state.currentTab = tab;
    this.emit(SocketEvents.TAB_CHANGED, { tab });
  }

  /**
   * Update current tab (for internal filtering)
   */
  public setCurrentTab(tab: TabType): void {
    this.state.currentTab = tab;
  }

  /**
   * Get current connection status
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance (use sparingly)
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Update event handlers
   */
  public updateHandlers(handlers: Partial<SocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Cleanup and destroy socket connection
   */
  public destroy(): void {
    console.log("🧹 Destroying socket connection");
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers = {};
  }

  /**
   * Get current connection state
   */
  public getState(): Readonly<SocketState> {
    return { ...this.state };
  }

  /**
   * Get socket metrics
   */
  public getMetrics(): Readonly<SocketMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get reconnection attempts count
   */
  public getReconnectAttempts(): number {
    return this.state.reconnectAttempts;
  }

  /**
   * Reset reconnection attempts counter
   */
  public resetReconnectAttempts(): void {
    this.state.reconnectAttempts = 0;
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      totalDisconnections: 0,
      totalErrors: 0,
      uptime: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
    };
  }
}

// Create singleton instance
let socketManagerInstance: SocketManager | null = null;

/**
 * Get or create socket manager instance
 */
export const getSocketManager = (config?: SocketConfig): SocketManager => {
  if (!socketManagerInstance) {
    socketManagerInstance = new SocketManager(config);
  }
  return socketManagerInstance;
};

/**
 * Reset socket manager instance (useful for testing or cleanup)
 */
export const resetSocketManager = (): void => {
  if (socketManagerInstance) {
    socketManagerInstance.destroy();
    socketManagerInstance = null;
  }
};

export default SocketManager;