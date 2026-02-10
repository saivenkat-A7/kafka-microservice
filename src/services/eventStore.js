const logger = require('../utils/logger');


class EventStore {
  constructor() {
    this.events = [];
    this.processedEventIds = new Set();
  }

  /**
   * Adds an event to the store if not already processed (idempotent)
   * @param {Object} event - Event object to store
   * @returns {boolean} - True if event was added, false if duplicate
   */
  addEvent(event) {
    if (!event || !event.eventId) {
      logger.warn('Attempted to add invalid event to store');
      return false;
    }

   
    if (this.processedEventIds.has(event.eventId)) {
      logger.info(`Duplicate event detected: ${event.eventId}. Skipping.`);
      return false;
    }

   
    this.events.push(event);
    this.processedEventIds.add(event.eventId);
    logger.info(`Event stored successfully: ${event.eventId}`);
    return true;
  }

  /**
   * Retrieves all processed events
   * @returns {Array} - Array of all processed events
   */
  getAllEvents() {
    return [...this.events];
  }

  /**
   * Gets the count of processed events
   * @returns {number} - Number of processed events
   */
  getEventCount() {
    return this.events.length;
  }

  /**
   * Checks if an event has been processed
   * @param {string} eventId - Event ID to check
   * @returns {boolean} - True if event was processed
   */
  hasEvent(eventId) {
    return this.processedEventIds.has(eventId);
  }

  
  clear() {
    this.events = [];
    this.processedEventIds.clear();
    logger.info('Event store cleared');
  }
}


module.exports = new EventStore();