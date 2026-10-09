/**
 * Analysis Routes
 * FIR, Legal Notice, Judgment, Plaint, Written Objection analysis
 */

const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const {
  analyzeFIR, generateBailApplication,
  analyzeLegalNotice, generateNoticeReply,
  analyzeJudgment, analyzePlaint
} = require('../services/ai.service');
const { runLegalReasoningChain } = require('../services/legalReasoningChain');
const { translateFIRToUrdu } = require('../services/translationService');
const { formatCourtDocx } = require('../services/drafting/generateDraft');

// ============================================================
// FIR ANALYSIS
// ============================================================

// POST /api/v1/analysis/fir
router.post('/fir', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let firText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        if (rows[0]) firText = rows[0].ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read document from DB:', dbErr.message);
      }
    }

    if (!firText?.trim()) {
      return res.status(400).json({ success: false, message: 'FIR text is required.' });
    }

    const { analysis, tokens, liveSearchStatus, seniorReviewed } = await analyzeFIR(firText, !!includeLiveSearch);

    let saved = null;
    if (req.user?.id) {
      try {
        const { rows } = await query(
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
        saved = rows[0];
      } catch (dbErr) {
        logger.warn('analysis.routes: DB insert for fir_analyses failed:', dbErr.message);
      }
    }

    const savedObj = saved || {
      id: 'fir_' + Date.now(),
      fir_number: analysis.fir_number,
      police_station: analysis.police_station,
      complainant_name: analysis.complainant_name,
      accused_names: analysis.accused_names,
      sections_applied: analysis.sections_applied,
      allegations: analysis.allegations,
      bail_possibility: analysis.bail_possibility,
      bail_reasoning: analysis.bail_reasoning,
      defence_suggestions: analysis.defence_suggestions,
      weak_points: analysis.weak_points,
      strong_points: analysis.strong_points,
      raw_analysis: analysis
    };

    res.json({ success: true, data: { analysis: savedObj, raw: analysis, liveSearchStatus, seniorReviewed } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/fir/deep
router.post('/fir/deep', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId } = req.body;
    let firText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        if (rows[0]) firText = rows[0].ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read document for deep analysis:', dbErr.message);
      }
    }

    if (!firText?.trim()) {
      return res.status(400).json({ success: false, message: 'FIR text is required.' });
    }

    const result = await runLegalReasoningChain(firText, 'FIR bail assessment');

    res.json({ success: true, data: { ...result, documentId: documentId || null, caseId: caseId || null } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/fir/:analysisId/bail
router.post('/fir/:analysisId/bail', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { bailType = 'pre_arrest', additionalInfo, rawAnalysis, firText } = req.body;
    let analysisData = rawAnalysis;

    if (!analysisData && req.params.analysisId && req.params.analysisId !== 'direct' && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT * FROM fir_analyses WHERE id = $1 AND user_id = $2',
          [req.params.analysisId, req.user.id]
        );
        if (rows[0]) analysisData = rows[0].raw_analysis;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not query fir_analyses:', dbErr.message);
      }
    }

    if (!analysisData && firText) {
      analysisData = { allegations: firText, sections_applied: ['PPC'], bail_possibility: 'bailable' };
    }

    if (!analysisData) {
      analysisData = { allegations: additionalInfo || 'Case under Pakistan Penal Code', sections_applied: ['PPC'] };
    }

    const { content, tokens } = await generateBailApplication(analysisData, bailType, additionalInfo);

    if (req.user?.id) {
      try {
        await query(
          `INSERT INTO drafts (user_id, title, draft_type, content, ai_model_used, tokens_used)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.id, `${bailType === 'pre_arrest' ? 'Pre-Arrest' : 'Post-Arrest'} Bail Application`,
           bailType === 'pre_arrest' ? 'pre_arrest_bail' : 'post_arrest_bail',
           content, 'gemini-3.6-flash', tokens?.output_tokens || 0]
        );
      } catch (dbErr) {
        logger.warn('analysis.routes: could not insert bail draft into DB:', dbErr.message);
      }
    }

    res.json({ success: true, data: { content } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/fir/bail-docx
router.post('/fir/bail-docx', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { title = 'BAIL APPLICATION', content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Draft content is required.' });
    }
    const docxBuffer = await formatCourtDocx(title, content);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="bail_application_${Date.now()}.docx"`);
    return res.send(docxBuffer);
  } catch (err) {
    next(err);
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

// POST /api/v1/analysis/fir/translate
router.post('/fir/translate', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, analysisId } = req.body;
    let firText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        if (rows[0]) firText = rows[0].ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for translate:', dbErr.message);
      }
    } else if (analysisId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT document_id FROM fir_analyses WHERE id = $1 AND user_id = $2',
          [analysisId, req.user.id]
        );
        if (rows[0]?.document_id) {
          const { rows: docRows } = await query(
            'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
            [rows[0].document_id, req.user.id]
          );
          firText = docRows[0]?.ocr_text || text;
        }
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read analysis document for translate:', dbErr.message);
      }
    }

    if (!firText?.trim()) {
      return res.status(400).json({ success: false, message: 'FIR text is required.' });
    }

    const { translation, tokens, chunkCount, possibleTruncation, sourceWordCount, translatedWordCount } =
      await translateFIRToUrdu(firText);

    res.json({
      success: true,
      data: {
        translation,
        sourceWordCount,
        translatedWordCount,
        chunkCount,
        possibleTruncation,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// LEGAL NOTICE ANALYSIS
// ============================================================

// POST /api/v1/analysis/notice
router.post('/notice', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let noticeText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        noticeText = rows[0]?.ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for notice:', dbErr.message);
      }
    }

    if (!noticeText?.trim()) {
      return res.status(400).json({ success: false, message: 'Notice text is required.' });
    }

    const { analysis, tokens, liveSearchStatus } = await analyzeLegalNotice(noticeText, !!includeLiveSearch);

    let saved = null;
    if (req.user?.id) {
      try {
        const { rows } = await query(
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
        saved = rows[0];
      } catch (dbErr) {
        logger.warn('analysis.routes: could not save notice analysis:', dbErr.message);
      }
    }

    const savedObj = saved || {
      id: 'notice_' + Date.now(),
      notice_type: analysis.notice_type,
      sender_name: analysis.sender_name,
      recipient_name: analysis.recipient_name,
      demands: analysis.demands,
      legal_issues: analysis.legal_issues,
      summary: analysis.summary,
      defence_strategy: analysis.defence_strategy,
      raw_analysis: analysis
    };

    res.json({ success: true, data: { analysis: savedObj, raw: analysis, liveSearchStatus } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/notice/deep
router.post('/notice/deep', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId } = req.body;
    let noticeText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        if (rows[0]) noticeText = rows[0].ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for notice deep:', dbErr.message);
      }
    }

    if (!noticeText?.trim()) {
      return res.status(400).json({ success: false, message: 'Notice text is required.' });
    }

    const result = await runLegalReasoningChain(noticeText, 'legal notice reply strategy');

    res.json({ success: true, data: { ...result, documentId: documentId || null, caseId: caseId || null } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/notice/:analysisId/reply
router.post('/notice/:analysisId/reply', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { recipientDetails, rawAnalysis, noticeText } = req.body;
    let analysisData = rawAnalysis;

    if (!analysisData && req.params.analysisId && req.params.analysisId !== 'direct' && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT * FROM notice_analyses WHERE id = $1 AND user_id = $2',
          [req.params.analysisId, req.user.id]
        );
        if (rows[0]) analysisData = rows[0].raw_analysis;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read notice_analyses:', dbErr.message);
      }
    }

    if (!analysisData && noticeText) {
      analysisData = { summary: noticeText, legal_issues: ['Disputed claim'] };
    }

    const { content, tokens } = await generateNoticeReply(analysisData || {}, recipientDetails);

    if (req.user?.id) {
      try {
        await query(
          'INSERT INTO drafts (user_id, title, draft_type, content, ai_model_used, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.user.id, 'Reply to Legal Notice', 'reply_notice', content, 'gemini-3.6-flash', tokens?.output_tokens || 0]
        );
      } catch (dbErr) {
        logger.warn('analysis.routes: could not save reply draft:', dbErr.message);
      }
    }

    res.json({ success: true, data: { content } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// JUDGMENT ANALYSIS
// ============================================================

// POST /api/v1/analysis/judgment
router.post('/judgment', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let judgmentText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        judgmentText = rows[0]?.ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for judgment:', dbErr.message);
      }
    }

    if (!judgmentText?.trim()) {
      return res.status(400).json({ success: false, message: 'Judgment text is required.' });
    }

    const { analysis, tokens, liveSearchStatus } = await analyzeJudgment(judgmentText, !!includeLiveSearch);

    let saved = null;
    if (req.user?.id) {
      try {
        const { rows } = await query(
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
        saved = rows[0];
      } catch (dbErr) {
        logger.warn('analysis.routes: could not save judgment analysis:', dbErr.message);
      }
    }

    const savedObj = saved || {
      id: 'judgment_' + Date.now(),
      court_name: analysis.court_name,
      parties: analysis.parties,
      facts: analysis.facts,
      issues: analysis.issues,
      findings: analysis.findings,
      decision: analysis.decision,
      appeal_grounds: analysis.appeal_grounds,
      applicable_laws: analysis.applicable_laws,
      summary: analysis.summary,
      raw_analysis: analysis
    };

    res.json({ success: true, data: { analysis: savedObj, raw: analysis, liveSearchStatus } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/judgment/deep
router.post('/judgment/deep', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId } = req.body;
    let judgmentText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        if (rows[0]) judgmentText = rows[0].ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for judgment deep:', dbErr.message);
      }
    }

    if (!judgmentText?.trim()) {
      return res.status(400).json({ success: false, message: 'Judgment text is required.' });
    }

    const result = await runLegalReasoningChain(judgmentText, 'judgment appeal strategy');

    res.json({ success: true, data: { ...result, documentId: documentId || null, caseId: caseId || null } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/analysis/plaint
router.post('/plaint', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { documentId, text, caseId, includeLiveSearch } = req.body;
    let plaintText = text;

    if (documentId && req.user?.id) {
      try {
        const { rows } = await query(
          'SELECT ocr_text FROM documents WHERE id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        plaintText = rows[0]?.ocr_text || text;
      } catch (dbErr) {
        logger.warn('analysis.routes: could not read ocr_text for plaint:', dbErr.message);
      }
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
