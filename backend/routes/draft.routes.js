/**
 * Draft Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { generateDraft, classifyDraftType, generateDocxDraft, availableTypes } = require('../services/ai.service');
const { runLegalReasoningChain } = require('../services/legalReasoningChain');

router.post('/generate', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const {
      draftType, details, language = 'english', caseId, title, deep, caseFacts,
      problemText, partyA, partyB, court, format, userFacts,
    } = req.body;

    const isDocxRequested =
      format === 'docx' ||
      req.query.format === 'docx' ||
      req.query.download === 'true' ||
      Boolean(userFacts) ||
      req.headers.accept?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // If docx is requested or userFacts is supplied for one of the court-ready templates:
    if (draftType && availableTypes.includes(draftType) && (isDocxRequested || (!details && userFacts))) {
      const factsForDocx = userFacts || caseFacts || (details ? JSON.stringify(details) : problemText) || 'Draft per Pakistani legal practice.';
      const docxBuffer = await generateDocxDraft(draftType, factsForDocx);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${draftType}.docx"`);
      return res.send(docxBuffer);
    }

    // ============================================================
    // SMART MODE: no draftType given — the client just described their
    // problem in plain words (`problemText`) and wants the system to act
    // like an advocate: work out what document the situation actually
    // calls for, then draft it — instead of the user picking a type
    // themselves from a fixed list.
    // ============================================================
    if (!draftType) {
      if (!problemText?.trim()) {
        return res.status(400).json({ success: false, message: 'Describe your problem, or pick a draft type.' });
      }

      const { classification, tokens: classifyTokens } = await classifyDraftType(problemText);

      if (!classification.draft_type) {
        // Too ambiguous to safely guess — ask back rather than drafting
        // the wrong document. This mirrors what a real advocate would do
        // with a walk-in client whose account is too thin to act on yet.
        return res.json({
          success: true,
          data: {
            needsClarification: true,
            classification,
          },
        });
      }

      // Always reason through the problem first (the "analysis" step the
      // client asked for) before drafting — an advocate doesn't draft off
      // a first read; they spot the issues, weigh both sides, then write.
      const deepAnalysis = await runLegalReasoningChain(problemText, `${classification.draft_type} drafting strategy`);

      const resolvedDetails = { partyA, partyB, court, caseDetails: problemText, ...(details || {}) };
      const { content, tokens } = await generateDraft(classification.draft_type, resolvedDetails, language, deepAnalysis);

      const { rows: [draft] } = await query(
        `INSERT INTO drafts (user_id, case_id, title, draft_type, content, language, ai_model_used, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, caseId || null, title || `${classification.draft_type} Draft (auto-detected)`,
         classification.draft_type, content, language, 'claude-sonnet-4-6',
         (tokens?.output_tokens || 0) + (deepAnalysis.tokens || 0) + (classifyTokens?.output_tokens || 0)]
      );

      return res.json({ success: true, data: { ...draft, classification, deepAnalysis } });
    }

    // ============================================================
    // MANUAL MODE: user already picked a draftType (existing behaviour)
    // ============================================================
    // Optional "deep" mode: same senior-advocate reasoning chain used by
    // FIR/Notice/Judgment/Plaint deep analysis, run here on caseFacts (the
    // underlying facts/description for this draft) before drafting, so the
    // document is grounded in that full issue-by-issue strategy work
    // instead of just the raw `details` fields. Both `deep: true` and a
    // non-empty `caseFacts` string are required — deep mode needs actual
    // prose to reason over, not just structured form fields.
    let deepAnalysis = null;
    let deepTokens = 0;
    if (deep && caseFacts?.trim()) {
      deepAnalysis = await runLegalReasoningChain(caseFacts, `${draftType} drafting strategy`);
      deepTokens = deepAnalysis.tokens || 0;
    }

    const { content, tokens } = await generateDraft(draftType, details || {}, language, deepAnalysis);

    const { rows: [draft] } = await query(
      `INSERT INTO drafts (user_id, case_id, title, draft_type, content, language, ai_model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, caseId || null, title || `${draftType} Draft`, draftType, content, language, 'claude-sonnet-4-6', (tokens?.output_tokens || 0) + deepTokens]
    );

    res.json({ success: true, data: draft });
  } catch (e) { next(e); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { draftType, caseId, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM drafts WHERE user_id = $1';
    const params = [req.user.id];
    if (draftType) { params.push(draftType); sql += ` AND draft_type = $${params.length}`; }
    if (caseId) { params.push(caseId); sql += ` AND case_id = $${params.length}`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (page - 1) * parseInt(limit));
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM drafts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Draft not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { content, title } = req.body;
    const { rows: [d] } = await query(
      'UPDATE drafts SET content = COALESCE($1, content), title = COALESCE($2, title), version = version + 1 WHERE id = $3 AND user_id = $4 RETURNING *',
      [content, title, req.params.id, req.user.id]
    );
    if (!d) return res.status(404).json({ success: false, message: 'Draft not found.' });
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
});

router.post('/generate-docx', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { draftType, userFacts, caseFacts, details, problemText } = req.body;
    if (!draftType || !availableTypes.includes(draftType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing draftType. Available: ${availableTypes.join(', ')}`,
      });
    }

    const facts = userFacts || caseFacts || (details ? JSON.stringify(details) : problemText) || 'Draft per Pakistani legal practice.';
    const docxBuffer = await generateDocxDraft(draftType, facts);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${draftType}.docx"`);
    return res.send(docxBuffer);
  } catch (e) {
    next(e);
  }
});

router.get('/:id/docx', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM drafts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Draft not found.' });

    const draft = rows[0];
    const draftType = availableTypes.includes(draft.draft_type) ? draft.draft_type : 'legal_notice';
    const docxBuffer = await generateDocxDraft(draftType, draft.content);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${draftType}_${draft.id}.docx"`);
    return res.send(docxBuffer);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
