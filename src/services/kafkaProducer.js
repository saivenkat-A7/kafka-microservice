const { Kafka, logLevel } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

class KafkaProducerService {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: [config.kafka.broker],
      connectionTimeout: config.kafka.connectionTimeout,
      requestTimeout: config.kafka.requestTimeout,
      retry: config.kafka.retry,
      logLevel: logLevel.ERROR,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    this.isConnected = false;
  }

 
  async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka Producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka Producer', { error: error.message });
      throw error;
    }
  }

  /**
   * Publishes an event to Kafka
   * @param {Object} event - Event object to publish
   * @returns {Object} - Metadata from Kafka
   */
  async publishEvent(event) {
    if (!this.isConnected) {
      throw new Error('Producer is not connected to Kafka');
    }

    try {
      const message = {
        key: event.userId, 
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          timestamp: event.timestamp,
        },
      };

      const result = await this.producer.send({
        topic: config.kafka.topic,
        messages: [message],
      });

      logger.info('Event published to Kafka', {
        eventId: event.eventId,
        topic: config.kafka.topic,
        partition: result[0].partition,
        offset: result[0].offset,
      });

      return result;
    } catch (error) {
      logger.error('Failed to publish event to Kafka', {
        eventId: event.eventId,
        error: error.message,
      });
      throw error;
    }
  }

 
  async disconnect() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Producer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka Producer', { error: error.message });
      throw error;
    }
  }
}


module.exports = new KafkaProducerService();