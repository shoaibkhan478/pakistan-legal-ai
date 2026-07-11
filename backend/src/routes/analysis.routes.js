/**
 * Analysis Routes
 * FIR, Legal Notice, Judgment, Plaint, Written Objection analysis
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const {
  analyzeFIR, generateBailApplication,
  analyzeLegalNotice, generateNoticeReply,
  analyzeJudgment, analyzePlaint
} = require('../services/ai.service');
const { runLegalReasoningChain } = require('../services/legalReasoningChain');

// ============================================================
// FIR ANALYSIS
// ============================================================

// POST /api/v1/analysis/fir
router.post('/fir', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let firText = text;

    if (documentId) {
      const { rows } = await query(
        'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });
      firText = rows[0].ocr_text || text;
    }

    if (!firText?.trim()) {
      return res.status(400).json({ success: false, message: 'FIR text is required.' });
    }

    const { analysis, tokens, liveSearchStatus, seniorReviewed } = await analyzeFIR(firText, !!includeLiveSearch);

    // Save analysis
    const { rows: [saved] } = await query(
      `INSERT INTO fir_analyses 
       (document_id, user_id, case_id, fir_number, police_station, complainant_name, 
        accused_names, sections_applied, allegations, bail_possibility, bail_reasoning,
        defence_suggestions, weak_points, strong_points, ai_summary, raw_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [documentId || null, req.user.id, caseId || null,
       analysis.fir_number, analysis.police_station, analysis.complainant_name,
       analysis.accused_names, analysis.sections_applied, analysis.allegations,
       analysis.bail_possibility, analysis.bail_reasoning,
       analysis.defence_suggestions, analysis.weak_points, analysis.strong_points,
       analysis.summary, JSON.stringify(analysis)]
    );

    await query(
      'INSERT INTO api_usage (user_id, feature, tokens_input, tokens_output, model_used) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'fir_analysis', tokens?.input_tokens || 0, tokens?.output_tokens || 0, 'claude-sonnet-4-6']
    );

    res.json({ success: true, data: { analysis: saved, raw: analysis, liveSearchStatus, seniorReviewed } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/fir/deep
// "Deep analysis" mode: runs the full multi-step reasoning chain
// (issue-spotting -> per-issue research -> dual-sided arguments ->
// rebuttal simulation -> strategy synthesis) instead of the single-shot
// analyzeFIR(). Slower and more expensive (~3N+2 model calls for N
// issues), so it's a separate opt-in endpoint rather than replacing /fir.
router.post('/fir/deep', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId } = req.body;
    let firText = text;

    if (documentId) {
      const { rows } = await query(
        'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });
      firText = rows[0].ocr_text || text;
    }

    if (!firText?.trim()) {
      return res.status(400).json({ success: false, message: 'FIR text is required.' });
    }

    const result = await runLegalReasoningChain(firText, 'FIR bail assessment');

    await query(
      'INSERT INTO api_usage (user_id, feature, tokens_input, tokens_output, model_used) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'fir_deep_analysis', 0, result.tokens || 0, 'gemini-reasoning-chain']
    );

    // Not persisted to fir_analyses (its schema is shaped for the
    // single-shot analysis) — returned directly. Persist separately if
    // deep analyses need to be retrievable later; a JSONB column keyed by
    // documentId/caseId would be the simplest addition.
    res.json({ success: true, data: { ...result, documentId: documentId || null, caseId: caseId || null } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/fir/:analysisId/bail
router.post('/fir/:analysisId/bail', authenticate, aiLimiter, async (req, res, next) => {  try {
    const { bailType = 'pre_arrest', additionalInfo } = req.body;
    const { rows } = await query(
      'SELECT * FROM fir_analyses WHERE id = $1 AND user_id = $2',
      [req.params.analysisId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'FIR analysis not found.' });

    const { content, tokens } = await generateBailApplication(rows[0].raw_analysis, bailType, additionalInfo);

    // Save draft
    await query(
      `INSERT INTO drafts (user_id, title, draft_type, content, ai_model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, `${bailType === 'pre_arrest' ? 'Pre-Arrest' : 'Post-Arrest'} Bail Application`,
       bailType === 'pre_arrest' ? 'pre_arrest_bail' : 'post_arrest_bail',
       content, 'claude-sonnet-4-6', tokens?.output_tokens || 0]
    );

    res.json({ success: true, data: { content } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analysis/fir
router.get('/fir', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM fir_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// LEGAL NOTICE ANALYSIS
// ============================================================

// POST /api/v1/analysis/notice
router.post('/notice', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let noticeText = text;

    if (documentId) {
      const { rows } = await query(
        'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user.id]
      );
      noticeText = rows[0]?.ocr_text || text;
    }

    if (!noticeText?.trim()) {
      return res.status(400).json({ success: false, message: 'Notice text is required.' });
    }

    const { analysis, tokens, liveSearchStatus } = await analyzeLegalNotice(noticeText, !!includeLiveSearch);

    const { rows: [saved] } = await query(
      `INSERT INTO notice_analyses 
       (document_id, user_id, case_id, notice_type, sender_name, recipient_name,
        demands, legal_issues, summary, defence_strategy, raw_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [documentId || null, req.user.id, caseId || null,
       analysis.notice_type, analysis.sender_name, analysis.recipient_name,
       analysis.demands, analysis.legal_issues, analysis.summary,
       analysis.defence_strategy, JSON.stringify(analysis)]
    );

    res.json({ success: true, data: { analysis: saved, raw: analysis, liveSearchStatus } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/notice/:analysisId/reply
router.post('/notice/:analysisId/reply', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { recipientDetails } = req.body;
    const { rows } = await query(
      'SELECT * FROM notice_analyses WHERE id = $1 AND user_id = $2',
      [req.params.analysisId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Notice analysis not found.' });

    const { content, tokens } = await generateNoticeReply(rows[0].raw_analysis, recipientDetails);

    await query(
      'INSERT INTO drafts (user_id, title, draft_type, content, ai_model_used, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'Reply to Legal Notice', 'reply_notice', content, 'claude-sonnet-4-6', tokens?.output_tokens || 0]
    );

    res.json({ success: true, data: { content } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// JUDGMENT ANALYSIS
// ============================================================

// POST /api/v1/analysis/judgment
router.post('/judgment', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let judgmentText = text;

    if (documentId) {
      const { rows } = await query(
        'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user.id]
      );
      judgmentText = rows[0]?.ocr_text || text;
    }

    if (!judgmentText?.trim()) {
      return res.status(400).json({ success: false, message: 'Judgment text is required.' });
    }

    const { analysis, tokens, liveSearchStatus } = await analyzeJudgment(judgmentText, !!includeLiveSearch);

    const { rows: [saved] } = await query(
      `INSERT INTO judgment_analyses 
       (document_id, user_id, case_id, court_name, parties, facts, issues,
        findings, decision, appeal_grounds, applicable_laws, ai_summary, raw_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [documentId || null, req.user.id, caseId || null,
       analysis.court_name, JSON.stringify(analysis.parties),
       analysis.facts, analysis.issues, analysis.findings,
       analysis.decision, analysis.appeal_grounds, analysis.applicable_laws,
       analysis.summary, JSON.stringify(analysis)]
    );

    res.json({ success: true, data: { analysis: saved, raw: analysis, liveSearchStatus } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/plaint
router.post('/plaint', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let plaintText = text;

    if (documentId) {
      const { rows } = await query(
        'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user.id]
      );
      plaintText = rows[0]?.ocr_text || text;
    }

    if (!plaintText?.trim()) {
      return res.status(400).json({ success: false, message: 'Plaint text is required.' });
    }

    const { analysis, tokens, liveSearchStatus } = await analyzePlaint(plaintText, !!includeLiveSearch);
    res.json({ success: true, data: { analysis, liveSearchStatus } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
