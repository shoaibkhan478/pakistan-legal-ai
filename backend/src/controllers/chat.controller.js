// backend/src/controllers/chat.controller.js
const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

const MAX_MESSAGE_LENGTH = 20000;
const MAX_MESSAGES = 40;

/**
 * POST /api/v1/chat/message
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], context?: string }
 * (also accepts a single `message` string for simple one-shot calls)
 */
async function handleChatMessage(req, res) {
  try {
    const { messages, message, context } = req.body || {};

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

    // Forwards to the same Gemini-backed service used by the legal chat feature.
    const result = await aiService.legalChat(chatMessages, context || '');

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        message: result.content, // flattened fallback for simple chat widgets
        reply: result.content,   // fallback for legacy chatbot layouts
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
