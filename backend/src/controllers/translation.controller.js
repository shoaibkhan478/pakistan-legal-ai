const { translateLegalDocument, SUPPORTED_LANGUAGES } = require('../services/translation.service');
const logger = require('../utils/logger');

const MAX_DOCUMENT_LENGTH = 50000;

/**
 * Handles literal legal document translation requests.
 */
async function handleTranslate(req, res, next) {
  try {
    const { sourceText, sourceLang = 'ur', targetLang = 'en' } = req.body || {};

    if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include a non-empty "sourceText" string.',
      });
    }

    if (sourceText.length > MAX_DOCUMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Document exceeds maximum supported length of ${MAX_DOCUMENT_LENGTH} characters.`,
      });
    }

    const validLangs = Object.keys(SUPPORTED_LANGUAGES);
    if (!validLangs.includes(sourceLang)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sourceLang "${sourceLang}". Supported languages: ${validLangs.join(', ')}`,
      });
    }

    if (!validLangs.includes(targetLang)) {
      return res.status(400).json({
        success: false,
        error: `Invalid targetLang "${targetLang}". Supported languages: ${validLangs.join(', ')}`,
      });
    }

    if (sourceLang === targetLang) {
      return res.status(400).json({
        success: false,
        error: `sourceLang and targetLang cannot be identical ("${sourceLang}").`,
      });
    }

    const result = await translateLegalDocument(sourceText, sourceLang, targetLang);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('handleTranslate error:', error);
    next(error);
  }
}

/**
 * Returns supported translation languages.
 */
async function getSupportedLanguages(req, res) {
  return res.status(200).json({
    success: true,
    data: SUPPORTED_LANGUAGES,
  });
}

module.exports = {
  handleTranslate,
  getSupportedLanguages,
};
