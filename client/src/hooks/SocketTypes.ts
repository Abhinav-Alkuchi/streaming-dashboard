/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tab types for the application
 */
export type TabType =
  | "dashboard"
  | "event-stream"
  | "historical"
  | "purchase-analysis"
  | "customer-journey"
  | "store-mode"
  | "generate-dashboard";

/**
 * Socket connection status
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "historical";

/**
 * Socket event handler callbacks
 */
export interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onConnectError?: (error: Error) => void;
  onDatabricksData?: (data: any) => void;
  onEventStreamData?: (data: any) => void;
  onError?: (error: { message: string }) => void;
  onConnectionInfo?: (info: any) => void;
  onDateChanged?: (data: { date: string }) => void;
  onServerStats?: (stats: any) => void;
  onQueryStarted?: (data: any) => void;
}

/**
 * Socket configuration options
 */
export interface SocketConfig {
  baseUrl?: string;
  timeout?: number;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  autoConnect?: boolean;
}

/**
 * Socket manager interface
 */
export interface ISocketManager {
  initialize(handlers: SocketEventHandlers): void;
  connect(): void;
  disconnect(): void;
  emit(event: string, data?: any): void;
  requestTabData(tab: TabType): void;
  refreshDashboard(): void;
  refreshEventStream(): void;
  changeDate(date: string): void;
  changeTab(tab: TabType): void;
  setCurrentTab(tab: TabType): void;
  isConnected(): boolean;
  updateHandlers(handlers: Partial<SocketEventHandlers>): void;
  destroy(): void;
}

/**
 * Socket event names (for type safety)
 */
export const SocketEvents = {
  // Client -> Server
  REQUEST_TAB_DATA: "request-tab-data",
  REFRESH_DATA: "refresh-data",
  REFRESH_EVENT_STREAM: "refresh-event-stream",
  CHANGE_DATE: "change-date",
  TAB_CHANGED: "tab-changed",

  // Server -> Client
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  DATABRICKS_DATA: "databricks-data",
  EVENT_STREAM_DATA: "event-stream-data",
  DATABRICKS_ERROR: "databricks-error",
  CONNECTION_INFO: "connection-info",
  DATE_CHANGED: "date-changed",
  SERVER_STATS: "server-stats",
  QUERY_STARTED: "query-started",
} as const;

/**
 * Socket event payload types
 */
export interface SocketEventPayloads {
  [SocketEvents.REQUEST_TAB_DATA]: { tabType: TabType };
  [SocketEvents.CHANGE_DATE]: { date: string };
  [SocketEvents.TAB_CHANGED]: { tab: TabType };
  [SocketEvents.DATE_CHANGED]: { date: string };
  [SocketEvents.DATABRICKS_ERROR]: { message: string };
}

/**
 * Socket state
 */
export interface SocketState {
  isConnected: boolean;
  currentTab: TabType;
  reconnectAttempts: number;
  lastError: string | null;
}

/**
 * Socket metrics for monitoring
 */
export interface SocketMetrics {
  totalConnections: number;
  totalDisconnections: number;
  totalErrors: number;
  uptime: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
}

export default SocketEvents;