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

const { handleLegalChat } = require('../controllers/legalChatController');

// If you have auth middleware, wire it in here:
// const { requireAuth } = require('../middleware/auth');
// router.post('/chat', requireAuth, handleLegalChat);

router.post('/chat', handleLegalChat);

module.exports = router;
