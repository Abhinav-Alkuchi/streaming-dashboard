import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import { CONFIG } from './config/constants.js';
import { PollingManager } from './managers/pollingManager.js';
import { EventStreamManager } from './managers/eventStreamManager.js';
import { SocketManager } from './managers/socketManager.js';
import routes from './routes/index.js';
import { getIndex } from './services/chatBotService.js';

dotenv.config();

// Enhanced Application State
const appState = {
  isPolling: false,
  isEventStreamPolling: false,
  latestData: null,
  currentDate: new Date().toISOString().split("T")[0],
  pollTimer: null,
  eventStreamTimer: null,
  connectedClients: new Map(),
  lastEventIds: new Set(),
  eventStreamCache: [],
  activeTabs: new Set(),
};


// Initialize Express and Socket.IO
const app = express();

const server = createServer(app);
const io = new Server(server, CONFIG.SOCKET_CONFIG);

// Initialize Managers
const pollingManager = new PollingManager(io, appState, CONFIG);
const eventStreamManager = new EventStreamManager(io, appState, CONFIG);
const socketManager = new SocketManager(io, appState, pollingManager, eventStreamManager, CONFIG);

// Middleware
app.use(cors({ origin: CONFIG.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use(routes);

// Socket.IO Event Handlers
const setupSocketHandlers = () => {
  io.on("connection", (socket) => {
    socketManager.handleConnection(socket);
  });
};

// Server Startup
const startupServer = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("Databricks Analytics Server Started - MODULAR ARCHITECTURE");
  console.log("=".repeat(60));
  console.log(`Server running on port ${CONFIG.PORT}`);
  console.log(`Current date: ${appState.currentDate}`);
  console.log(`-----> MAIN DATA: Auto-refresh every ${CONFIG.MAIN_DATA_POLL_INTERVAL/1000}s (Dashboard tab only)`);
  console.log(`------> EVENT STREAM: Auto-refresh every ${CONFIG.EVENT_STREAM_POLL_INTERVAL/1000}s (Event Stream tab only)`);
  console.log("=".repeat(60) + "\n");

  // Pre-warm connection on startup
  console.log("-----> Pre-warming Databricks connection...");
  try {
    await preWarmConnection();
    console.log("------> Connection pre-warmed successfully");
  } catch (error) {
    console.warn("Pre-warm failed (cluster might be starting):", error.message);
  }

  console.log("-----> Pre-warming Pinecone connection...");
  try {
    await getIndex(); // This will initialize the Pinecone connection
    console.log("------> Pinecone connection pre-warmed successfully");
  } catch (error) {
    console.warn("Pinecone pre-warm failed:", error.message);
  }

  console.log("\n Server ready - Polling will auto-start when clients connect\n");
};

// Graceful Shutdown
const setupGracefulShutdown = () => {
  process.on("SIGINT", async () => {
    console.log("\n\n Shutting down gracefully...");

    // Notify clients
    io.emit("server-shutdown", {
      message: "Server is shutting down",
      timestamp: new Date().toISOString(),
    });

    // Clear all polling timers
    pollingManager.stopAutoPolling();
    eventStreamManager.stopEventStreamPolling();

    // Close connections
    appState.connectedClients.clear();
    appState.activeTabs.clear();
    io.close();
    server.close();

    console.log("Server shut down gracefully");
    process.exit(0);
  });
};

// Start the server
const startServer = async () => {
  setupSocketHandlers();
  setupGracefulShutdown();
  await startupServer();
};

server.listen(CONFIG.PORT, startServer);