const config = require('../config');
const logger = require('./utils/logger');
const createApp = require('./app');
const kafkaProducer = require('./services/kafkaProducer');
const kafkaConsumer = require('./services/kafkaConsumer');


const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
   
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    
    await kafkaConsumer.disconnect();
    await kafkaProducer.disconnect();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};


const startApplication = async () => {
  try {
    logger.info('Starting application...', {
      name: config.app.name,
      env: config.app.env,
      port: config.app.port,
    });

    
    logger.info('Connecting Kafka Producer...');
    await kafkaProducer.connect();

    
    logger.info('Connecting Kafka Consumer...');
    await kafkaConsumer.connect();
    await kafkaConsumer.startConsuming();

    
    const app = createApp();
    const server = app.listen(config.app.port, () => {
      logger.info(`Server is running on port ${config.app.port}`);
      logger.info('Application started successfully');
    });

   
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    
    global.server = server;

    return server;
  } catch (error) {
    logger.error('Failed to start application', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};


if (require.main === module) {
  startApplication();
}

module.exports = startApplication;