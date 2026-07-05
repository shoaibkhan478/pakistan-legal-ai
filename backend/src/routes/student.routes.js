/**
 * Student Mode Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { generateMCQs, generateVivaQuestions, generateNotes, generateCaseBrief } = require('../services/ai.service');

// Generate MCQs
router.post('/mcq', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { topic, subject, count = 10, difficulty = 'intermediate' } = req.body;
    if (!topic || !subject) return res.status(400).json({ success: false, message: 'Topic and subject required.' });
    
    const { mcqs, tokens } = await generateMCQs(topic, subject, count, difficulty);
    
    await query(
      'INSERT INTO student_resources (user_id, resource_type, topic, subject, content, difficulty_level, tokens_used) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'mcq', topic, subject, JSON.stringify(mcqs), difficulty, tokens?.output_tokens || 0]
    );
    
    res.json({ success: true, data: { mcqs, topic, subject } });
  } catch (e) { next(e); }
});

// Generate Viva Questions
router.post('/viva', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { topic, subject, count = 15 } = req.body;
    const { questions, tokens } = await generateVivaQuestions(topic, subject, count);
    
    await query(
      'INSERT INTO student_resources (user_id, resource_type, topic, subject, content, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'viva', topic, subject, JSON.stringify(questions), tokens?.output_tokens || 0]
    );
    
    res.json({ success: true, data: { questions, topic, subject } });
  } catch (e) { next(e); }
});

// Generate Notes
router.post('/notes', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { topic, subject, language = 'english' } = req.body;
    const { content, tokens } = await generateNotes(topic, subject, language);
    
    await query(
      'INSERT INTO student_resources (user_id, resource_type, topic, subject, content, language, tokens_used) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'notes', topic, subject, JSON.stringify({ content }), language, tokens?.output_tokens || 0]
    );
    
    res.json({ success: true, data: { content, topic, subject } });
  } catch (e) { next(e); }
});

// Generate Case Brief
router.post('/case-brief', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { caseName, facts } = req.body;
    const { content, tokens } = await generateCaseBrief(caseName, facts);
    
    await query(
      'INSERT INTO student_resources (user_id, resource_type, topic, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'case_brief', caseName, JSON.stringify({ content }), tokens?.output_tokens || 0]
    );
    
    res.json({ success: true, data: { content, caseName } });
  } catch (e) { next(e); }
});

// Get saved resources
router.get('/resources', authenticate, async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT id, resource_type, topic, subject, difficulty_level, created_at FROM student_resources WHERE user_id = $1';
    const params = [req.user.id];
    if (type) { params.push(type); sql += ` AND resource_type = $${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
