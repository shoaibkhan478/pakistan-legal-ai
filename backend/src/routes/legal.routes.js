// backend/src/routes/legal.routes.js
//
// Renamed from legalRoutes.js to match your project's naming convention
// (auth.routes.js, user.routes.js, chat.routes.js, etc.) and to remove the
// duplicate `legalRoutes` identifier clash that was in server.js.
//
// Mounted in server.js as:
//   app.use('/api/v1/legal', legalRoutes);

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { handleLegalChat } = require('../controllers/legalChatController');

router.post('/chat', authenticate, aiLimiter, handleLegalChat);

module.exports = router;
