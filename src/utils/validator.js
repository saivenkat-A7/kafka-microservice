const VALID_EVENT_TYPES = ['LOGIN', 'LOGOUT', 'PRODUCT_VIEW'];

/**
 * Validates the event payload
 * @param {Object} event - Event object to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
const validateEventPayload = (event) => {
  const errors = [];

  if (!event) {
    errors.push('Event payload is required');
    return { valid: false, errors };
  }

  if (!event.userId || typeof event.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }

  if (!event.eventType || typeof event.eventType !== 'string') {
    errors.push('eventType is required and must be a string');
  } else if (!VALID_EVENT_TYPES.includes(event.eventType)) {
    errors.push(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  // payload is optional but if provided should be an object
  if (event.payload !== undefined && typeof event.payload !== 'object') {
    errors.push('payload must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEventPayload,
  VALID_EVENT_TYPES,
};