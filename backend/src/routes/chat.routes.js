const express = require('express');
const router = express.Router();

const { handleChatMessage } = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/message', authenticate, handleChatMessage);

module.exports = router;
