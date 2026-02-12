# Event-Driven Microservice with Apache Kafka

A production-ready microservice implementation demonstrating event-driven architecture using Apache Kafka. This service acts as both a producer and consumer, publishing and processing user activity events with built-in idempotency and robust error handling.



##  Features

- **Event-Driven Architecture**: Asynchronous communication using Apache Kafka
- **Producer & Consumer**: Single service handles both publishing and consuming events
- **Idempotency**: Ensures events are processed exactly once using eventId
- **In-Memory Storage**: Simple event store for processed events
- **Robust Error Handling**: Graceful handling of Kafka failures and malformed messages
- **Health Checks**: Container health monitoring for all services
- **Comprehensive Testing**: Unit and integration tests with high coverage
- **Docker Support**: Fully containerized with Docker Compose
- **Graceful Shutdown**: Proper cleanup of Kafka connections

##  Architecture

The microservice follows a clean architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                   Express API Layer                      │
│  (POST /events/generate, GET /events/processed)         │
└────────────────┬───────────────────────────┬────────────┘
                 │                           │
                 ▼                           ▼
         ┌───────────────┐          ┌──────────────┐
         │ Kafka Producer│          │Event Store   │
         │   Service     │          │(In-Memory)   │
         └───────┬───────┘          └──────▲───────┘
                 │                         │
                 ▼                         │
         ┌────────────────────────────────┐│
         │      Apache Kafka Broker       ││
         │   (user-activity-events)       ││
         └────────┬───────────────────────┘│
                  │                        │
                  ▼                        │
         ┌────────────────┐                │
         │ Kafka Consumer │────────────────┘
         │    Service     │  (Idempotent Processing)
         └────────────────┘
```

### Event Flow

1. **Event Generation**: Client sends POST request to `/events/generate`
2. **Validation**: Event payload is validated for required fields
3. **Event Creation**: Service generates `eventId` and `timestamp`
4. **Publishing**: Event is published to Kafka topic `user-activity-events`
5. **Consumption**: Kafka consumer receives and processes the event
6. **Idempotency Check**: Consumer checks if eventId was already processed
7. **Storage**: Event is stored in in-memory data structure (if not duplicate)
8. **Retrieval**: Client can query processed events via `/events/processed`

##  Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/saivenkat-A7/kafka-microservice.git
cd kafka-microservice
```

### 2. Start All Services

```bash
docker-compose up --build
```

This command will:
- Start Zookeeper
- Start Kafka broker
- Build and start the application service
- Wait for all health checks to pass

### 3. Verify Services are Running

```bash
# Check service health
curl 

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-02-10T...",
  "service": "kafka-event-microservice",
  "kafka": {
    "producer": "connected"
  },
  "eventStore": {
    "processedEvents": 0
  }
}
```

### 4. Generate an Event

```bash
curl -X POST http://localhost:3000/events/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "eventType": "LOGIN",
    "payload": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0"
    }
  }'

# Expected response:
{
  "message": "Event published successfully",
  "eventId": "a1b2c3d4-...",
  "timestamp": "2026-02-10T..."
}
```

### 5. Query Processed Events

```bash
curl http://localhost:3000/events/processed

# Expected response:
{
  "count": 1,
  "events": [
    {
      "eventId": "a1b2c3d4-...",
      "userId": "user-123",
      "eventType": "LOGIN",
      "timestamp": "2026-02-10T...",
      "payload": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0"
      }
    }
  ]
}
```

##  API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### 1. Generate Event

**Endpoint**: `POST /events/generate`

**Description**: Generates and publishes a user activity event to Kafka.

**Request Body**:
```json
{
  "userId": "string (required)",
  "eventType": "LOGIN | LOGOUT | PRODUCT_VIEW (required)",
  "payload": "object (optional)"
}
```

**Response** (201 Created):
```json
{
  "message": "Event published successfully",
  "eventId": "uuid-string",
  "timestamp": "ISO-8601-timestamp"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid payload
- `500 Internal Server Error`: Kafka publishing failure
- `503 Service Unavailable`: Kafka not connected

**Example**:
```bash
curl -X POST http://localhost:3000/events/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "eventType": "PRODUCT_VIEW",
    "payload": {
      "productId": "prod-789",
      "category": "electronics"
    }
  }'
```

#### 2. Get Processed Events

**Endpoint**: `GET /events/processed`

**Description**: Retrieves all events that have been successfully consumed and processed.

**Response** (200 OK):
```json
{
  "count": 2,
  "events": [
    {
      "eventId": "uuid-1",
      "userId": "user-123",
      "eventType": "LOGIN",
      "timestamp": "ISO-8601-timestamp",
      "payload": {}
    },
    {
      "eventId": "uuid-2",
      "userId": "user-456",
      "eventType": "PRODUCT_VIEW",
      "timestamp": "ISO-8601-timestamp",
      "payload": {
        "productId": "prod-789"
      }
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3000/events/processed
```

#### 3. Health Check

**Endpoint**: `GET /health`

**Description**: Returns the health status of the service and its dependencies.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "ISO-8601-timestamp",
  "service": "kafka-event-microservice",
  "kafka": {
    "producer": "connected"
  },
  "eventStore": {
    "processedEvents": 5
  }
}
```

**Example**:
```bash
curl http://localhost:3000/health
```

##  Testing

### Run All Tests



#  using Docker
```
docker-compose exec app npm test
```

### Run Unit Tests Only



# using Docker
```
docker-compose exec app npm run test:unit
```

### Run Integration Tests Only



#  using Docker
```
docker-compose exec app npm run test:integration
```

### Test Coverage

The project maintains high test coverage:
- **Unit Tests**: Validator, EventStore, business logic
- **Integration Tests**: End-to-end API flows, Kafka integration

Expected output:
```
Test Suites: 3 passed, 3 total
Tests:       30+ passed, 30+ total
Coverage:    > 85%
```






### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (cleans Kafka data)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f kafka
```


##  Monitoring and Debugging

### Check Kafka Topics

```bash
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Monitor Kafka Messages

```bash
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-activity-events \
  --from-beginning \
  --property print.key=true
```

### View Application Logs

```bash
docker-compose logs -f app
```

## 🎯 Key Implementation Details

### Idempotency

The consumer implements idempotency using a Set to track processed `eventId` values:

```javascript
// Only process if not already seen
if (this.processedEventIds.has(event.eventId)) {
  logger.info(`Duplicate event detected: ${event.eventId}. Skipping.`);
  return false;
}
```

### Error Handling

- **Producer**: Retries on transient failures, logs permanent failures
- **Consumer**: Gracefully handles malformed messages without crashing
- **API**: Returns appropriate HTTP status codes and error messages

### Graceful Shutdown

The application handles SIGTERM and SIGINT signals:

```javascript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```


