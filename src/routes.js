const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.post('/events/generate', eventController.generateEvent);
router.get('/events/processed', eventController.getProcessedEvents);

router.get('/health', eventController.healthCheck);

module.exports = router;