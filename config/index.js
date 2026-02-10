require('dotenv').config();

const config = {
  app: {
    name: process.env.APP_NAME || 'kafka-microservice',
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost:9092',
    clientId: process.env.KAFKA_CLIENT_ID || 'event-microservice',
    topic: process.env.KAFKA_TOPIC || 'user-activity-events',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'user-activity-consumer-group',
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10) || 30000,
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT, 10) || 30000,
    retry: {
      retries: parseInt(process.env.KAFKA_RETRY_ATTEMPTS, 10) || 5,
      initialRetryTime: parseInt(process.env.KAFKA_RETRY_DELAY, 10) || 300,
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;