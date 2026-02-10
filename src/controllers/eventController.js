const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { validateEventPayload } = require('../utils/validator');
const kafkaProducer = require('../services/kafkaProducer');
const eventStore = require('../services/eventStore');


const generateEvent = async (req, res) => {
  try {
    const { userId, eventType, payload } = req.body;

   
    const validation = validateEventPayload({ userId, eventType, payload });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

   
    const event = {
      eventId: uuidv4(),
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      payload: payload || {},
    };

   
    await kafkaProducer.publishEvent(event);

    logger.info('Event generated and published', {
      eventId: event.eventId,
      userId: event.userId,
      eventType: event.eventType,
    });


    return res.status(201).json({
      message: 'Event published successfully',
      eventId: event.eventId,
      timestamp: event.timestamp,
    });
  } catch (error) {
    logger.error('Error in generateEvent', { error: error.message });

    
    if (error.message.includes('not connected')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Kafka producer is not available',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to publish event',
    });
  }
};

const getProcessedEvents = async (req, res) => {
  try {
    const events = eventStore.getAllEvents();

    logger.info('Retrieved processed events', { count: events.length });

    return res.status(200).json({
      count: events.length,
      events: events.map(event => ({
        eventId: event.eventId,
        userId: event.userId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        payload: event.payload,
      })),
    });
  } catch (error) {
    logger.error('Error in getProcessedEvents', { error: error.message });

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve processed events',
    });
  }
};


const healthCheck = async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'kafka-event-microservice',
    kafka: {
      producer: kafkaProducer.isConnected ? 'connected' : 'disconnected',
    },
    eventStore: {
      processedEvents: eventStore.getEventCount(),
    },
  };

  const statusCode = kafkaProducer.isConnected ? 200 : 503;
  return res.status(statusCode).json(health);
};

module.exports = {
  generateEvent,
  getProcessedEvents,
  healthCheck,
};