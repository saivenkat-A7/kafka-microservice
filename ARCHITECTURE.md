# Architecture Documentation

## System Overview

This document provides an in-depth look at the architectural decisions, design patterns, and implementation details of the Event-Driven Microservice with Apache Kafka.



## Architecture Principles

### Event-Driven Architecture (EDA)

The system follows core EDA principles:

- **Asynchronous Communication**: Services communicate through events rather than direct calls
- **Loose Coupling**: Producer and consumer are independent; they don't need to know about each other
- **Event Immutability**: Once published, events cannot be modified
- **Eventually Consistent**: The system achieves consistency over time rather than immediately

### Separation of Concerns

The codebase is organized into distinct layers:

```
Presentation Layer (API)
        ↓
Business Logic Layer (Controllers)
        ↓
Service Layer (Kafka, Storage)
        ↓
Infrastructure Layer (Configuration, Logging)
```

## System Components

### 1. Express API Layer

**Purpose**: Handles HTTP requests and responses

**Key Files**:
- `src/app.js`: Express application setup
- `src/routes.js`: Route definitions
- `src/controllers/eventController.js`: Request handlers

**Design Decisions**:
- RESTful design for intuitive API usage
- JSON-based communication for wide compatibility
- Comprehensive error handling with appropriate HTTP status codes
- Middleware for request logging and validation

### 2. Kafka Producer Service

**Purpose**: Publishes events to Kafka broker

**Key File**: `src/services/kafkaProducer.js`

**Implementation Details**:
```javascript
// Singleton pattern for shared connection
module.exports = new KafkaProducerService();

// Partitioning by userId for ordered processing
const message = {
  key: event.userId,  // Ensures same user's events go to same partition
  value: JSON.stringify(event),
  headers: { eventType, timestamp }
};
```

**Design Decisions**:
- **Singleton Pattern**: Single producer instance shared across requests
- **Partitioning Strategy**: Using userId as key ensures events from the same user maintain order
- **Connection Pooling**: Reuses connections for efficiency
- **Retry Logic**: Configured at Kafka client level for transient failures
- **Async Publishing**: Non-blocking event publishing

### 3. Kafka Consumer Service

**Purpose**: Consumes and processes events from Kafka

**Key File**: `src/services/kafkaConsumer.js`

**Implementation Details**:
```javascript
// Consumer group for scalability
this.consumer = this.kafka.consumer({
  groupId: config.kafka.consumerGroup,
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

// Subscribe from beginning to ensure no messages are missed
await this.consumer.subscribe({
  topic: config.kafka.topic,
  fromBeginning: true,
});
```

**Design Decisions**:
- **Consumer Groups**: Enables horizontal scaling of consumers
- **Auto-commit**: Enabled for simplicity (production might use manual commits)
- **Error Isolation**: Malformed messages don't crash the consumer
- **Graceful Degradation**: Logs errors and continues processing

### 4. Event Store (In-Memory)

**Purpose**: Stores processed events with idempotency guarantees

**Key File**: `src/services/eventStore.js`

**Implementation Details**:
```javascript
class EventStore {
  constructor() {
    this.events = [];                    // Array for ordered storage
    this.processedEventIds = new Set();  // Set for O(1) duplicate checking
  }
  
  addEvent(event) {
    if (this.processedEventIds.has(event.eventId)) {
      return false;  // Idempotent: reject duplicates
    }
    this.events.push(event);
    this.processedEventIds.add(event.eventId);
    return true;
  }
}
```

**Design Decisions**:
- **Dual Data Structure**: Array for retrieval, Set for fast duplicate detection
- **Singleton Pattern**: Single shared instance across the application
- **Time Complexity**: O(1) for idempotency check, O(1) for insertion
- **Memory Management**: No size limits (production would implement eviction policies)

### 5. Validation Layer

**Purpose**: Ensures data integrity before processing

**Key File**: `src/utils/validator.js`

**Design Decisions**:
- **Fail-Fast Validation**: Reject invalid events before Kafka publishing
- **Explicit Event Types**: Whitelist of allowed event types
- **Detailed Error Messages**: Help clients understand validation failures

## Event Flow

### Complete Event Lifecycle

```
1. Client Request
   POST /events/generate
   { userId, eventType, payload }
        ↓
2. Validation
   - Check required fields
   - Validate event type
   - Validate payload structure
        ↓
3. Event Enrichment
   - Generate UUID for eventId
   - Add ISO 8601 timestamp
   - Normalize payload
        ↓
4. Kafka Publishing
   - Partition by userId
   - Serialize to JSON
   - Add headers (eventType, timestamp)
   - Publish to user-activity-events topic
        ↓
5. Kafka Storage
   - Store in partition based on key
   - Replicate across brokers (if configured)
   - Maintain ordering within partition
        ↓
6. Consumer Polling
   - Consumer polls Kafka
   - Receives messages in batches
   - Deserializes JSON
        ↓
7. Idempotency Check
   - Check if eventId exists in Set
   - If exists: skip, if new: proceed
        ↓
8. Event Processing
   - Log to stdout (eventId, userId, eventType)
   - Store in events array
   - Add eventId to processed set
        ↓
9. Query Response
   GET /events/processed
   Returns all unique processed events
```

### Sequence Diagram

```
Client          API            Producer        Kafka         Consumer      EventStore
  |              |                |              |              |              |
  |--POST------->|                |              |              |              |
  |              |--validate----->|              |              |              |
  |              |                |              |              |              |
  |              |--publish------>|--send------->|              |              |
  |              |                |              |              |              |
  |<--201--------|                |              |              |              |
  |              |                |              |              |              |
  |              |                |              |--poll------->|              |
  |              |                |              |              |              |
  |              |                |              |<--consume----|              |
  |              |                |              |              |              |
  |              |                |              |              |--check------>|
  |              |                |              |              |              |
  |              |                |              |              |<--exists?----|
  |              |                |              |              |              |
  |              |                |              |              |--store------>|
  |              |                |              |              |              |
  |--GET-------->|                |              |              |              |
  |              |                |              |              |              |
  |              |<---------------------------------------------getAllEvents---|
  |              |                |              |              |              |
  |<--200--------|                |              |              |              |
```

## Design Decisions

### 1. Why In-Memory Storage?

**Decision**: Use in-memory data structures instead of a database

**Advantages**:
- **Focus on Core Concepts**: Emphasizes Kafka and event processing over database operations
- **Simplicity**: Reduces dependencies and complexity
- **Performance**: Extremely fast read/write operations
- **Demonstration**: Sufficient for demonstrating idempotency and event storage

**Disadvantages**:
- Data lost on restart
- No persistence across deployments
- Limited by available RAM



### 2. Why Partition by UserId?

**Decision**: Use userId as Kafka message key

**Rationale**:
- **Ordering Guarantee**: All events from same user go to same partition
- **Temporal Consistency**: LOGIN before LOGOUT for same user
- **Load Distribution**: Users distributed across partitions

**Example**:
```javascript
// User A's events → Partition 0
{eventId: 1, userId: 'A', eventType: 'LOGIN'}
{eventId: 2, userId: 'A', eventType: 'PRODUCT_VIEW'}
{eventId: 3, userId: 'A', eventType: 'LOGOUT'}

// User B's events → Partition 1
{eventId: 4, userId: 'B', eventType: 'LOGIN'}
```

### 3. Why Consumer Groups?

**Decision**: Use consumer groups for scalability

**Rationale**:
- **Parallel Processing**: Multiple consumers share partition load
- **Fault Tolerance**: If one consumer fails, others take over
- **Scalability**: Add consumers to increase throughput

**Scaling Example**:
```
Single Consumer:
  Consumer 1 → [Partition 0, 1, 2, 3]
  Throughput: N events/sec

Consumer Group (3 consumers):
  Consumer 1 → [Partition 0, 1]
  Consumer 2 → [Partition 2]
  Consumer 3 → [Partition 3]
  Throughput: ~3N events/sec
```

### 4. Why Idempotency via EventId?

**Decision**: Use UUID-based eventId for idempotency

**Rationale**:
- **Exactly-Once Semantics**: Same event processed only once
- **Duplicate Prevention**: Network retries don't create duplicates
- **Audit Trail**: Unique identifier for each event

**Implementation**:
```javascript
// Set provides O(1) lookup
if (processedEventIds.has(eventId)) {
  // Already processed - skip
  return false;
}

// New event - process and mark as seen
processedEventIds.add(eventId);
events.push(event);
```

### 5. Why Singleton Services?

**Decision**: Export singleton instances for Kafka services

**Rationale**:
- **Connection Pooling**: Reuse expensive Kafka connections
- **Resource Efficiency**: Avoid multiple connections per request
- **State Management**: Single source of truth for connection state

**Pattern**:
```javascript
class KafkaProducerService {
  constructor() {
    this.kafka = new Kafka({...});
    this.producer = this.kafka.producer();
  }
}

// Export singleton
module.exports = new KafkaProducerService();
```

## Scalability Considerations

### Horizontal Scaling

**Current Limitations**:
- In-memory storage not shared across instances
- Each instance has its own event store

**Solution for Production**:
```
Load Balancer
      ↓
[Instance 1] ← → Redis/Database
[Instance 2] ← → (Shared Storage)
[Instance 3] ← → 
```

### Kafka Partitioning

**Current Setup**:
- Single partition (default)
- Single consumer processes all events

**Scaling to Multiple Partitions**:
```javascript
// Create topic with multiple partitions
docker-compose exec kafka kafka-topics --create \
  --topic user-activity-events \
  --partitions 10 \
  --replication-factor 3 \
  --bootstrap-server localhost:9092

// Deploy multiple consumer instances
docker-compose scale app-service=5
```

### Performance Metrics

**Expected Throughput** (single instance):
- **Producer**: ~10,000 events/sec
- **Consumer**: ~5,000 events/sec
- **API**: ~1,000 requests/sec

**Bottlenecks**:
1. Network I/O to Kafka
2. JSON serialization/deserialization
3. In-memory storage operations

## Future Enhancements

### 1. Dead Letter Queue (DLQ)

**Purpose**: Handle messages that fail processing

```javascript
async handleMessage(message) {
  try {
    await processEvent(event);
  } catch (error) {
    if (isRetryable(error)) {
      // Retry with backoff
      await retry(processEvent, event);
    } else {
      // Send to DLQ for manual inspection
      await sendToDLQ(message, error);
    }
  }
}
```

### 2. Schema Evolution

**Purpose**: Handle changes in event structure over time

```javascript
// Avro schema with schema registry
const eventSchema = {
  type: 'record',
  name: 'UserEvent',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'eventType', type: 'string' },
    { name: 'timestamp', type: 'string' },
    { name: 'payload', type: ['null', 'string'], default: null }
  ]
};
```

## Security Considerations

### 1. Authentication & Authorization

**Future Implementation**:
- API authentication via JWT tokens
- Kafka SASL/SSL authentication
- Role-based access control

### 2. Data Privacy

**Considerations**:
- Encrypt sensitive payload data
- Implement data retention policies
- GDPR compliance for user data

### 3. Rate Limiting

**Implementation**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/events/generate', limiter);
```



