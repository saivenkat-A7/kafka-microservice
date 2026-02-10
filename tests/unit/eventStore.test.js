// Create a new instance for each test to avoid singleton issues
const EventStore = require('../../src/services/eventStore').constructor;

describe('EventStore - Idempotency and Storage', () => {
  let eventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  describe('addEvent', () => {
    it('should add a valid event successfully', () => {
      const event = {
        eventId: 'event-123',
        userId: 'user-456',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
        payload: {},
      };

      const result = eventStore.addEvent(event);

      expect(result).toBe(true);
      expect(eventStore.getEventCount()).toBe(1);
      expect(eventStore.hasEvent('event-123')).toBe(true);
    });

    it('should reject duplicate events (idempotency)', () => {
      const event = {
        eventId: 'event-123',
        userId: 'user-456',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
        payload: {},
      };

      // Add first time
      const firstResult = eventStore.addEvent(event);
      expect(firstResult).toBe(true);

      // Try to add same event again
      const secondResult = eventStore.addEvent(event);
      expect(secondResult).toBe(false);

      // Should still only have one event
      expect(eventStore.getEventCount()).toBe(1);
    });

    it('should reject events without eventId', () => {
      const event = {
        userId: 'user-456',
        eventType: 'LOGIN',
      };

      const result = eventStore.addEvent(event);

      expect(result).toBe(false);
      expect(eventStore.getEventCount()).toBe(0);
    });

    it('should handle multiple different events', () => {
      const events = [
        { eventId: 'event-1', userId: 'user-1', eventType: 'LOGIN', timestamp: new Date().toISOString() },
        { eventId: 'event-2', userId: 'user-2', eventType: 'LOGOUT', timestamp: new Date().toISOString() },
        { eventId: 'event-3', userId: 'user-3', eventType: 'PRODUCT_VIEW', timestamp: new Date().toISOString() },
      ];

      events.forEach(event => {
        const result = eventStore.addEvent(event);
        expect(result).toBe(true);
      });

      expect(eventStore.getEventCount()).toBe(3);
    });
  });

  describe('getAllEvents', () => {
    it('should return empty array when no events', () => {
      const events = eventStore.getAllEvents();

      expect(events).toEqual([]);
      expect(events).toHaveLength(0);
    });

    it('should return all stored events', () => {
      const testEvents = [
        { eventId: 'event-1', userId: 'user-1', eventType: 'LOGIN', timestamp: new Date().toISOString() },
        { eventId: 'event-2', userId: 'user-2', eventType: 'LOGOUT', timestamp: new Date().toISOString() },
      ];

      testEvents.forEach(event => eventStore.addEvent(event));

      const events = eventStore.getAllEvents();

      expect(events).toHaveLength(2);
      expect(events).toEqual(expect.arrayContaining(testEvents));
    });

    it('should return a copy of events array', () => {
      const event = {
        eventId: 'event-1',
        userId: 'user-1',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
      };

      eventStore.addEvent(event);

      const events1 = eventStore.getAllEvents();
      const events2 = eventStore.getAllEvents();

      expect(events1).not.toBe(events2); // Different array instances
      expect(events1).toEqual(events2); // Same content
    });
  });

  describe('hasEvent', () => {
    it('should return true for existing event', () => {
      const event = {
        eventId: 'event-123',
        userId: 'user-456',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
      };

      eventStore.addEvent(event);

      expect(eventStore.hasEvent('event-123')).toBe(true);
    });

    it('should return false for non-existing event', () => {
      expect(eventStore.hasEvent('non-existing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      const events = [
        { eventId: 'event-1', userId: 'user-1', eventType: 'LOGIN', timestamp: new Date().toISOString() },
        { eventId: 'event-2', userId: 'user-2', eventType: 'LOGOUT', timestamp: new Date().toISOString() },
      ];

      events.forEach(event => eventStore.addEvent(event));
      expect(eventStore.getEventCount()).toBe(2);

      eventStore.clear();

      expect(eventStore.getEventCount()).toBe(0);
      expect(eventStore.getAllEvents()).toHaveLength(0);
    });
  });
});