import { fetchLiveEventStream } from '../services/databricksService.js';
import { EventDeduplicator } from '../utils/eventDeduplicator.js';

export class EventStreamManager {
  constructor(io, appState, CONFIG) {
    this.io = io;
    this.appState = appState;
    this.CONFIG = CONFIG;
  }

  async pollEventStream() {
    if (this.appState.isEventStreamPolling) {
      return;
    }

    this.appState.isEventStreamPolling = true;

    try {
      const startTime = Date.now();
      const date = new Date();
      const formattedDate = date.toISOString().split("T")[0];
      const eventStreamData = await fetchLiveEventStream(formattedDate, 100);
      const queryTime = Date.now() - startTime;

      if (eventStreamData && eventStreamData.length > 0) {
        const recentEventIds = new Set();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const newEvents = eventStreamData.filter((event) => {
          const eventId = EventDeduplicator.getEventId(event);
          const eventTime = new Date(event.timestamp || event.event_timestamp);

          if (
            !recentEventIds.has(eventId) &&
            (eventTime > fiveMinutesAgo || !this.appState.lastEventIds.has(eventId))
          ) {
            recentEventIds.add(eventId);
            return true;
          }
          return false;
        });

        newEvents.forEach((event) => {
          this.appState.lastEventIds.add(EventDeduplicator.getEventId(event));
        });

        if (this.appState.lastEventIds.size > 1000) {
          const array = Array.from(this.appState.lastEventIds);
          this.appState.lastEventIds = new Set(array.slice(-500));
        }

        if (newEvents.length > 0) {
          this.broadcastEventStreamData(newEvents, queryTime, "incremental");
        }
      }
    } catch (error) {
      console.error("EVENT STREAM polling error:", error.message);
    } finally {
      this.appState.isEventStreamPolling = false;
    }
  }

  broadcastEventStreamData(eventStreamData, queryTime, updateType = "incremental") {
    const enhancedEvents = eventStreamData.map((event) => ({
      ...event,
      _metadata: {
        receivedAt: new Date().toISOString(),
        source: "real-time-poll",
        isNew: true,
        updateType: updateType,
      },
    }));

    this.io.emit("event-stream-data", {
      data: enhancedEvents,
      date: this.appState.currentDate,
      timestamp: new Date().toISOString(),
      queryTime: queryTime,
      recordCount: enhancedEvents.length,
      source: "live-event-poll",
      updateType: updateType,
      refreshType: "event-stream",
    });
  }

  startEventStreamPolling() {
    if (this.appState.eventStreamTimer) {
      clearInterval(this.appState.eventStreamTimer);
    }

    this.appState.eventStreamTimer = setInterval(async () => {
      if (this.appState.activeTabs.has("event-stream")) {
        await this.pollEventStream();
      }
    }, this.CONFIG.EVENT_STREAM_POLL_INTERVAL);
  }

  stopEventStreamPolling() {
    if (this.appState.eventStreamTimer) {
      clearInterval(this.appState.eventStreamTimer);
      this.appState.eventStreamTimer = null;
    }
  }

  resetEventTracking() {
    this.appState.lastEventIds.clear();
  }

  async refreshEventStreamImmediately() {
    await this.pollEventStream();
  }
}