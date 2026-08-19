const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { handleChatMessage } = require('../controllers/chat.controller');

router.post('/message', authenticate, aiLimiter, handleChatMessage);

module.exports = router;
