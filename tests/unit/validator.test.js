const { validateEventPayload, VALID_EVENT_TYPES } = require('../../src/utils/validator');

describe('Validator - validateEventPayload', () => {
  describe('Valid payloads', () => {
    it('should validate a correct event payload', () => {
      const event = {
        userId: 'user123',
        eventType: 'LOGIN',
        payload: { ip: '192.168.1.1' },
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate event without payload field', () => {
      const event = {
        userId: 'user123',
        eventType: 'LOGOUT',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate all event types', () => {
      VALID_EVENT_TYPES.forEach(eventType => {
        const event = {
          userId: 'user123',
          eventType,
        };

        const result = validateEventPayload(event);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Invalid payloads', () => {
    it('should reject null/undefined event', () => {
      const result = validateEventPayload(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event payload is required');
    });

    it('should reject missing userId', () => {
      const event = {
        eventType: 'LOGIN',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a string');
    });

    it('should reject missing eventType', () => {
      const event = {
        userId: 'user123',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('eventType is required and must be a string');
    });

    it('should reject invalid eventType', () => {
      const event = {
        userId: 'user123',
        eventType: 'INVALID_TYPE',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('eventType must be one of');
    });

    it('should reject non-string userId', () => {
      const event = {
        userId: 123,
        eventType: 'LOGIN',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a string');
    });

    it('should reject non-object payload', () => {
      const event = {
        userId: 'user123',
        eventType: 'LOGIN',
        payload: 'invalid',
      };

      const result = validateEventPayload(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('payload must be an object');
    });
  });
});