const { Kafka, logLevel } = require('kafkajs');
const config = require('../../config');
const logger = require('../utils/logger');
const eventStore = require('./eventStore');

class KafkaConsumerService {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: [config.kafka.broker],
      connectionTimeout: config.kafka.connectionTimeout,
      requestTimeout: config.kafka.requestTimeout,
      retry: config.kafka.retry,
      logLevel: logLevel.ERROR,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.consumerGroup,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    this.isConnected = false;
    this.isRunning = false;
  }

  /**
   * Connects and starts the consumer
   */
  async connect() {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka Consumer connected successfully');

      await this.consumer.subscribe({
        topic: config.kafka.topic,
        fromBeginning: true,
      });

      logger.info(`Kafka Consumer subscribed to topic: ${config.kafka.topic}`);
    } catch (error) {
      logger.error('Failed to connect Kafka Consumer', { error: error.message });
      throw error;
    }
  }

  /**
   * Starts consuming messages
   */
  async startConsuming() {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected to Kafka');
    }

    this.isRunning = true;

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, partition, message);
        },
      });

      logger.info('Kafka Consumer started consuming messages');
    } catch (error) {
      logger.error('Error in consumer run', { error: error.message });
      throw error;
    }
  }

  /**
   * Handles incoming Kafka messages
   * @param {string} topic - Kafka topic
   * @param {number} partition - Partition number
   * @param {Object} message - Kafka message object
   */
  async handleMessage(topic, partition, message) {
    try {
      // Parse the message value
      const eventString = message.value.toString();
      const event = JSON.parse(eventString);

      logger.info('Message received from Kafka', {
        topic,
        partition,
        offset: message.offset,
        eventId: event.eventId,
        userId: event.userId,
        eventType: event.eventType,
      });

      // Process the event with idempotency
      const wasAdded = await this.processEvent(event);

      if (wasAdded) {
        logger.info('Event processed successfully', {
          eventId: event.eventId,
          userId: event.userId,
          eventType: event.eventType,
        });
      }
    } catch (error) {
      // Handle malformed messages gracefully
      logger.error('Error processing message', {
        error: error.message,
        topic,
        partition,
        offset: message.offset,
        rawMessage: message.value?.toString().substring(0, 100),
      });

      // Don't throw - this allows consumer to continue processing other messages
      // In production, could send to DLQ here
    }
  }

  /**
   * Processes an event and stores it with idempotency
   * @param {Object} event - Event object to process
   * @returns {boolean} - True if event was processed, false if duplicate
   */
  async processEvent(event) {
    try {
      // Validate event has required fields
      if (!event.eventId || !event.userId || !event.eventType) {
        logger.warn('Invalid event structure', { event });
        return false;
      }

      // Log the event to stdout as required
      console.log(JSON.stringify({
        action: 'EVENT_CONSUMED',
        eventId: event.eventId,
        userId: event.userId,
        eventType: event.eventType,
        timestamp: new Date().toISOString(),
      }));

      // Store event with idempotency check
      const wasAdded = eventStore.addEvent(event);

      return wasAdded;
    } catch (error) {
      logger.error('Error in processEvent', {
        eventId: event.eventId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Disconnects the consumer from Kafka
   */
  async disconnect() {
    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Consumer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka Consumer', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new KafkaConsumerService();