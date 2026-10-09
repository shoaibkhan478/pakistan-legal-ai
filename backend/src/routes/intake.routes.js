// backend/src/routes/intake.routes.js
//
// POST /api/v1/intake
// Body: { problemText: string, language?, triggerDate?, limitationCaseTypeKey?, forceDraft?, skipDraft?, caseId? }
//
// Single autonomous entry point: the client describes their problem once,
// and the orchestrator (caseIntakeOrchestrator.js) decides for itself what
// needs to run — limitation check, deep research, and drafting — instead
// of the user having to pick a mode. If caseId is supplied, the result
// (including any limitation deadline found) is also saved onto that case's
// metadata/next_action so it shows up in the deadline tracker.
const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { runCaseIntake } = require('../services/caseIntakeOrchestrator');
const { formatCourtDocx } = require('../services/drafting/generateDraft');
const MAX_PROBLEM_LENGTH = 150000;

router.post('/', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { problemText, language, triggerDate, limitationCaseTypeKey, forceDraft, skipDraft, caseId } = req.body || {};
    if (!problemText || typeof problemText !== 'string' || !problemText.trim()) {
      return res.status(400).json({ success: false, error: 'problemText is required.' });
    }
    if (problemText.length > MAX_PROBLEM_LENGTH) {
      return res.status(400).json({ success: false, error: `problemText exceeds max length of ${MAX_PROBLEM_LENGTH} characters.` });
    }
    const result = await runCaseIntake(problemText, {
      language,
      triggerDate,
      limitationCaseTypeKey,
      forceDraft: Boolean(forceDraft),
      skipDraft: Boolean(skipDraft),
    });

    // If this intake is tied to an existing case and user is authenticated,
    // persist the limitation deadline onto the case.
    if (caseId && req.user?.id && result.limitationCheck?.detected && result.limitationCheck?.deadline) {
      try {
        await query(
          `UPDATE cases SET next_action = $1,
             metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
           WHERE id = $3 AND user_id = $4`,
          [
            `${result.limitationCheck.caseType} — deadline ${result.limitationCheck.deadline}`,
            JSON.stringify({ limitationDeadline: result.limitationCheck.deadline, limitationUrgency: result.limitationCheck.urgency }),
            caseId,
            req.user.id,
          ]
        );
      } catch (err) {
        logger.warn('intake.routes: failed to persist limitation deadline onto case:', err.message || err);
      }
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('handleCaseIntake error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Case intake failed.' });
  }
});

// POST /api/v1/intake/generate-docx
// Exports an intake draft directly into an authentic Pakistani Court-Ready .docx document
router.post('/generate-docx', optionalAuth, async (req, res, next) => {
  try {
    const { title, content } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'content is required to generate a docx.' });
    }

    const docxTitle = title || 'Court Ready Draft';
    const buffer = await formatCourtDocx(docxTitle, content);

    const safeFilename = docxTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50) || 'Pakistani_Court_Draft';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.docx"`);
    return res.send(buffer);
  } catch (err) {
    logger.error('intake.routes generate-docx error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to export .docx draft.' });
  }
});

module.exports = router;