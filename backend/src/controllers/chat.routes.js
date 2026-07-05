const express = require('express');
const router = express.Router();

const { handleChatMessage } = require('../controllers/chat.controller');

router.post('/message', handleChatMessage);

module.exports = router;