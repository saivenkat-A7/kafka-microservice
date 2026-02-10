const request = require('supertest');
const createApp = require('../../src/app');


jest.mock('../../src/services/kafkaProducer', () => ({
  publishEvent: jest.fn().mockResolvedValue([{ partition: 0, offset: '123' }]),
  isConnected: true,
  connect: jest.fn().mockResolvedValue(),
  disconnect: jest.fn().mockResolvedValue(),
}));

jest.mock('../../src/services/kafkaConsumer', () => ({
  connect: jest.fn().mockResolvedValue(),
  startConsuming: jest.fn().mockResolvedValue(),
  disconnect: jest.fn().mockResolvedValue(),
  isConnected: true,
}));

const kafkaProducer = require('../../src/services/kafkaProducer');
const eventStore = require('../../src/services/eventStore');

describe('Integration Tests - API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    
    eventStore.clear();
    jest.clearAllMocks();
  });

  describe('POST /events/generate', () => {
    it('should successfully generate and publish an event', async () => {
      const eventData = {
        userId: 'user-123',
        eventType: 'LOGIN',
        payload: { ip: '192.168.1.1' },
      };

      const response = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Event published successfully');
      expect(response.body).toHaveProperty('eventId');
      expect(response.body).toHaveProperty('timestamp');
      expect(kafkaProducer.publishEvent).toHaveBeenCalledTimes(1);

      // Verify the event structure passed to Kafka
      const publishedEvent = kafkaProducer.publishEvent.mock.calls[0][0];
      expect(publishedEvent).toMatchObject({
        userId: 'user-123',
        eventType: 'LOGIN',
        payload: { ip: '192.168.1.1' },
      });
      expect(publishedEvent).toHaveProperty('eventId');
      expect(publishedEvent).toHaveProperty('timestamp');
    });

    it('should generate unique eventIds for multiple events', async () => {
      const eventData = {
        userId: 'user-123',
        eventType: 'LOGIN',
      };

      const response1 = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(201);

      const response2 = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(201);

      expect(response1.body.eventId).not.toBe(response2.body.eventId);
    });

    it('should reject invalid event without userId', async () => {
      const eventData = {
        eventType: 'LOGIN',
      };

      const response = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('userId is required and must be a string');
      expect(kafkaProducer.publishEvent).not.toHaveBeenCalled();
    });

    it('should reject invalid event without eventType', async () => {
      const eventData = {
        userId: 'user-123',
      };

      const response = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(kafkaProducer.publishEvent).not.toHaveBeenCalled();
    });

    it('should reject invalid eventType', async () => {
      const eventData = {
        userId: 'user-123',
        eventType: 'INVALID_EVENT',
      };

      const response = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(kafkaProducer.publishEvent).not.toHaveBeenCalled();
    });

    it('should handle Kafka publish failure', async () => {
      kafkaProducer.publishEvent.mockRejectedValueOnce(new Error('Kafka error'));

      const eventData = {
        userId: 'user-123',
        eventType: 'LOGIN',
      };

      const response = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('GET /events/processed', () => {
    it('should return empty array when no events processed', async () => {
      const response = await request(app)
        .get('/events/processed')
        .expect(200);

      expect(response.body).toHaveProperty('count', 0);
      expect(response.body).toHaveProperty('events');
      expect(response.body.events).toEqual([]);
    });

    it('should return all processed events', async () => {
      // Manually add events to store to simulate consumed events
      const event1 = {
        eventId: 'event-1',
        userId: 'user-1',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
        payload: {},
      };

      const event2 = {
        eventId: 'event-2',
        userId: 'user-2',
        eventType: 'LOGOUT',
        timestamp: new Date().toISOString(),
        payload: {},
      };

      eventStore.addEvent(event1);
      eventStore.addEvent(event2);

      const response = await request(app)
        .get('/events/processed')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ eventId: 'event-1', userId: 'user-1' }),
          expect.objectContaining({ eventId: 'event-2', userId: 'user-2' }),
        ])
      );
    });

    it('should return events with all required fields', async () => {
      const event = {
        eventId: 'event-1',
        userId: 'user-1',
        eventType: 'PRODUCT_VIEW',
        timestamp: new Date().toISOString(),
        payload: { productId: 'prod-123' },
      };

      eventStore.addEvent(event);

      const response = await request(app)
        .get('/events/processed')
        .expect(200);

      expect(response.body.events[0]).toHaveProperty('eventId');
      expect(response.body.events[0]).toHaveProperty('userId');
      expect(response.body.events[0]).toHaveProperty('eventType');
      expect(response.body.events[0]).toHaveProperty('timestamp');
      expect(response.body.events[0]).toHaveProperty('payload');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('kafka');
      expect(response.body).toHaveProperty('eventStore');
    });

    it('should include Kafka connection status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.kafka).toHaveProperty('producer');
    });

    it('should include event store count', async () => {
      eventStore.addEvent({
        eventId: 'event-1',
        userId: 'user-1',
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.eventStore.processedEvents).toBe(1);
    });
  });

  describe('End-to-end flow simulation', () => {
    it('should handle complete event lifecycle', async () => {
      
      const eventData = {
        userId: 'user-999',
        eventType: 'PRODUCT_VIEW',
        payload: { productId: 'prod-456' },
      };

      const generateResponse = await request(app)
        .post('/events/generate')
        .send(eventData)
        .expect(201);

      const eventId = generateResponse.body.eventId;

      
      const publishedEvent = kafkaProducer.publishEvent.mock.calls[0][0];
      eventStore.addEvent(publishedEvent);

      
      const processedResponse = await request(app)
        .get('/events/processed')
        .expect(200);

      expect(processedResponse.body.count).toBe(1);
      expect(processedResponse.body.events[0]).toMatchObject({
        eventId,
        userId: 'user-999',
        eventType: 'PRODUCT_VIEW',
      });
    });
  });
});