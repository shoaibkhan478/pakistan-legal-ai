/**
 * backend/src/routes/legal-search.routes.js
 * -----------------------------------------------------
 * Route: POST /api/legal-search
 * Body: { "question": "Qatl-e-amd ki saza kya hai?" }
 * -----------------------------------------------------
 */

const express = require('express');
const router = express.Router();
const { runLiveLegalSearch } = require('../services/legal-search.service');

router.post('/', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await runLiveLegalSearch(question);
    return res.json(result);
  } catch (err) {
    console.error('legal-search error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
