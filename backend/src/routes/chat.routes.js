const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { handleChatMessage } = require('../controllers/chat.controller');

router.post('/message', optionalAuth, aiLimiter, handleChatMessage);

module.exports = router;
