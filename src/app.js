const express = require('express');
const config = require('../config');
const logger = require('./utils/logger');
const routes = require('./routes');


const createApp = () => {
  const app = express();


  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Routes
  app.use('/', routes);

 
  app.get('/', (req, res) => {
    res.json({
      service: config.app.name,
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        generateEvent: 'POST /events/generate',
        processedEvents: 'GET /events/processed',
      },
    });
  });


  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

 
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
    });

    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: config.app.env === 'development' ? err.message : 'An error occurred',
    });
  });

  return app;
};

module.exports = createApp;