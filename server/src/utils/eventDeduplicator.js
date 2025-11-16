export const EventDeduplicator = {
  getEventId(event) {
    return (
      event.id ||
      `${event.type}-${event.timestamp}-${event.user}-${event.product}`
    );
  },

  filterNewEvents(events, existingIds) {
    const newEvents = [];
    const newIds = new Set(existingIds);

    events.forEach((event) => {
      const eventId = this.getEventId(event);
      if (!existingIds.has(eventId)) {
        newEvents.push(event);
        newIds.add(eventId);
      }
    });

    return { newEvents, newIds };
  },
};