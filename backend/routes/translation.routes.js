const express = require('express');
const router = express.Router();
const { handleTranslate, getSupportedLanguages } = require('../controllers/translation.controller');
const { aiLimiter } = require('../middleware/rateLimiter');

router.get('/languages', getSupportedLanguages);
router.post('/translate', aiLimiter, handleTranslate);
router.post('/', aiLimiter, handleTranslate);

module.exports = router;
