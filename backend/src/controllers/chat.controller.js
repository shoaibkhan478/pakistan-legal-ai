// backend/src/controllers/chat.controller.js
const aiService = require('../services/ai.service');
const { runLegalReasoningChain } = require('../services/legalReasoningChain');
const logger = require('../utils/logger');

const MAX_MESSAGE_LENGTH = 20000;
const MAX_MESSAGES = 40;

// How many prior turns of conversation to fold into the "case facts" text
// handed to the deep reasoning chain, so a Senior Advocate Mode answer
// isn't blind to what was already discussed earlier in the chat (e.g. the
// user gave facts in message 1, then asks "so is bail possible?" in
// message 3) — same reason the fast chat path already sends full history.
const DEEP_MODE_CONTEXT_TURNS = 6;

/**
 * Renders a runLegalReasoningChain() result down into a single Markdown
 * string — used as the plain-text fallback (`content`/`message`/`reply`)
 * for chat history, search, and any client that isn't rendering the rich
 * `deepAnalysis` object. Kept intentionally readable on its own, since a
 * saved chat session re-opened later only has this text, not the JSON.
 */
function renderDeepAnalysisAsMarkdown(result) {
  const { synthesis, issue_chains, verificationSummary } = result;
  const parts = [];

  parts.push(`### ⚖️ Senior Advocate Assessment\n\n${synthesis.case_theory || ''}`);

  if (issue_chains?.length) {
    parts.push(
      issue_chains
        .map((ic) => {
          const lines = [`**Issue: ${ic.issue}**`];
          if (ic.key_points?.length) lines.push(`- Applicable law: ${ic.key_points.join('; ')}`);
          if (ic.supporting_arguments?.length) lines.push(`- In your favour: ${ic.supporting_arguments.join('; ')}`);
          if (ic.opposing_arguments?.length) lines.push(`- Opposing side may argue: ${ic.opposing_arguments.join('; ')}`);
          if (ic.rebuttal_points?.length) lines.push(`- Rebuttal: ${ic.rebuttal_points.join('; ')}`);
          return lines.join('\n');
        })
        .join('\n\n')
    );
  }

  if (synthesis.overall_assessment) parts.push(`**Overall assessment:** ${synthesis.overall_assessment}`);
  if (synthesis.strategy_recommendation) parts.push(`**Recommended strategy:** ${synthesis.strategy_recommendation}`);
  if (synthesis.risk_factors?.length) parts.push(`**Risks to be aware of:**\n${synthesis.risk_factors.map((r) => `- ${r}`).join('\n')}`);
  if (synthesis.legal_references?.length) {
    const verified = result.legal_references_verified || [];
    parts.push(
      `**Legal references:**\n${synthesis.legal_references
        .map((ref) => {
          const v = verified.find((x) => x.citation === ref);
          const badge = v?.status === 'verified_local' ? ' ✓ verified (library)'
            : v?.status === 'verified_live' ? ' ✓ verified (live search)'
              : ' ⚠ unverified';
          return `- ${ref}${badge}`;
        })
        .join('\n')}`
    );
  }
  if (verificationSummary?.total) {
    parts.push(`_${verificationSummary.verified_local + verificationSummary.verified_live} of ${verificationSummary.total} citations independently verified._`);
  }

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Builds the "case facts" text handed to the reasoning chain out of recent
 * chat history, so multi-turn context isn't lost — the chain itself only
 * takes one flat text blob, not a conversation array.
 */
function buildCaseTextFromHistory(chatMessages) {
  const recent = chatMessages.slice(-DEEP_MODE_CONTEXT_TURNS);
  return recent
    .map((m) => `${m.role === 'user' ? 'Client' : 'Advocate'}: ${m.message || m.content}`)
    .join('\n\n');
}

/**
 * POST /api/v1/chat/message
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], context?: string, deepMode?: boolean }
 * (also accepts a single `message` string for simple one-shot calls)
 *
 * deepMode (a.k.a. "Senior Advocate Mode", opt-in from the chat UI):
 * instead of one fast single-pass answer, runs the full multi-step
 * reasoning chain (issue-spotting -> research+argue both sides ->
 * rebuttal simulation -> strategy synthesis -> independent citation
 * verification) already used for FIR/draft deep analysis, against the
 * live conversation. Slower (multiple sequential/parallel AI calls) and
 * therefore off by default — the user explicitly asks for it when they
 * want the deeper, auditable reasoning instead of a quick answer.
 */
async function handleChatMessage(req, res) {
  try {
    const { messages, message, context, deepMode } = req.body || {};

    const chatMessages = Array.isArray(messages) && messages.length > 0
      ? messages
      : (message ? [{ role: 'user', content: message }] : null);

    if (!chatMessages) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include either a non-empty "messages" array or a "message" string.',
      });
    }

    if (chatMessages.length > MAX_MESSAGES) {
      return res.status(400).json({
        success: false,
        error: `Too many messages in a single request (max ${MAX_MESSAGES}).`,
      });
    }

    for (const m of chatMessages) {
      const text = m?.message || m?.content;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Each message must have a non-empty string "content".',
        });
      }
      if (text.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Message exceeds max length of ${MAX_MESSAGE_LENGTH} characters.`,
        });
      }
    }

    if (deepMode) {
      const caseText = buildCaseTextFromHistory(chatMessages);
      const deepAnalysis = await runLegalReasoningChain(caseText, 'client chat consultation');
      const content = renderDeepAnalysisAsMarkdown(deepAnalysis);

      return res.status(200).json({
        success: true,
        data: {
          content,
          message: content,
          reply: content,
          deepAnalysis,
          mode: 'deep',
          tokens: deepAnalysis.tokens,
        },
        content,
      });
    }

    // Forwards to the same Gemini-backed service used by the legal chat feature.
    const result = await aiService.legalChat(chatMessages, context || '');

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        message: result.content, // flattened fallback for simple chat widgets
        reply: result.content,   // fallback for legacy chatbot layouts
        mode: 'fast',
        tokens: result.tokens,
        model: result.model,
      },
      content: result.content, // root-level fallback for simplified clients
    });
  } catch (error) {
    logger.error('handleChatMessage error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Chat request failed.',
    });
  }
}

module.exports = { handleChatMessage };
