// // backend/src/controllers/legalChatController.js

// const aiService = require('../services/ai.service');
// const logger = require('../utils/logger');

// const MAX_MESSAGE_LENGTH = 6000;
// const MAX_MESSAGES = 40;

// /**
//  * POST /api/v1/legal/chat
//  * Body: { messages: [{ role: 'user'|'assistant', content: string }], context?: string }
//  * (also accepts a single `message` string for simple one-shot calls)
//  */
// async function handleLegalChat(req, res) {
//   try {
//     const { messages, message, context } = req.body || {};

//     const chatMessages = Array.isArray(messages) && messages.length > 0
//       ? messages
//       : (message ? [{ role: 'user', content: message }] : null);

//     if (!chatMessages) {
//       return res.status(400).json({
//         success: false,
//         error: 'Request body must include either a non-empty "messages" array or a "message" string.',
//       });
//     }

//     if (chatMessages.length > MAX_MESSAGES) {
//       return res.status(400).json({
//         success: false,
//         error: `Too many messages in a single request (max ${MAX_MESSAGES}).`,
//       });
//     }

//     for (const m of chatMessages) {
//       const text = m?.message || m?.content;
//       if (!text || typeof text !== 'string') {
//         return res.status(400).json({
//           success: false,
//           error: 'Each message must have a non-empty string "content".',
//         });
//       }
//       if (text.length > MAX_MESSAGE_LENGTH) {
//         return res.status(400).json({
//           success: false,
//           error: `Message exceeds max length of ${MAX_MESSAGE_LENGTH} characters.`,
//         });
//       }
//     }

//     const result = await aiService.legalChat(chatMessages, context || '');

//     return res.status(200).json({
//       success: true,
//       data: {
//         content: result.content,
//         message: result.content,
//         reply: result.content,
//         tokens: result.tokens,
//         model: result.model,
//       },
//       content: result.content,
//     });
//   } catch (error) {
//     logger.error('handleLegalChat error:', error);
//     return res.status(500).json({
//       success: false,
//       error: error.message || 'Legal chat request failed.',
//     });
//   }
// }

// module.exports = { handleLegalChat };


// backend/src/controllers/legalChatController.js

const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

const MAX_MESSAGE_LENGTH = 6000;
const MAX_MESSAGES = 40;

/**
 * POST /api/v1/legal/chat
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], context?: string }
 * (also accepts a single `message` string for simple one-shot calls)
 */
async function handleLegalChat(req, res) {
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

    const result = await aiService.legalChat(chatMessages, context || '');

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        message: result.content,
        reply: result.content,
        tokens: result.tokens,
        model: result.model,
      },
      content: result.content,
    });
  } catch (error) {
    logger.error('handleLegalChat error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Legal chat request failed.',
    });
  }
}

module.exports = { handleLegalChat };