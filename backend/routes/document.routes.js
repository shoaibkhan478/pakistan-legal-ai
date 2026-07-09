/**
 * Document Routes - Upload, OCR, Management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pdf = require('pdf-parse');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { authenticate } = require('../middleware/auth.middleware');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { audit } = require('../utils/auditLog');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * The mimetype/extension check above trusts whatever the browser claims a
 * file is — a bad actor can rename any file to "fir.pdf" and the check above
 * would still pass it. This reads the first few real bytes of the file on
 * disk and checks them against the known "magic number" signature for each
 * allowed type, so a file's actual content has to match what it claims to be.
 * Word docs (.doc/.docx) are intentionally not checked here — many valid
 * variants exist and OCR/mammoth will simply fail gracefully on a bad one.
 */
function verifyFileSignature(filePath, mimeType) {
  const signatures = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/tiff': [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A]]
  };
  const expected = signatures[mimeType];
  if (!expected) return true; // no signature defined for this type (e.g. Word docs) — skip check

  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  return expected.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

/**
 * Runs OCR on an image file using Tesseract, reading both Urdu and English
 * (most Pakistani FIRs/notices mix both — station name/header in English,
 * body text in Urdu, or vice versa). Preprocesses the image first (grayscale,
 * normalize contrast, sharpen) since scanned/photographed legal documents are
 * very often slightly blurry, low-contrast, or unevenly lit — this step
 * measurably improves accuracy on exactly that kind of input without
 * requiring the user to re-take/re-scan the photo.
 */
async function runOcr(filePath) {
  const preprocessedPath = `${filePath}-preprocessed.png`;
  try {
    await sharp(filePath)
      .grayscale()
      .normalize() // stretches contrast — helps a lot with dim/washed-out photos
      .sharpen()
      .toFile(preprocessedPath);

    // 'eng+urd' loads both language models — Tesseract tries both scripts.
    const worker = await createWorker('eng+urd');
    try {
      const { data } = await worker.recognize(preprocessedPath);
      return { text: data.text || '', confidence: Math.round(data.confidence || 0) };
    } finally {
      await worker.terminate();
    }
  } finally {
    fs.unlink(preprocessedPath, () => {}); // best-effort cleanup, ignore errors
  }
}

/**
 * Extract text from uploaded file
 */
async function extractText(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      // A scanned PDF (photo saved as PDF, no real text layer) yields almost
      // no text from pdf-parse — fall back to OCR on that case too, since
      // otherwise the user gets a silent empty result for exactly the kind
      // of document (a photographed FIR) they're most likely to upload.
      if (data.text && data.text.trim().length > 20) {
        return { text: data.text, method: 'pdf-parse', confidence: 95 };
      }
      logger.info('PDF had no extractable text layer (likely a scanned image) — falling back to OCR.');
      const ocrResult = await runOcr(filePath);
      return { text: ocrResult.text, method: 'ocr-fallback', confidence: ocrResult.confidence };
    }

    // Scanned photo / image upload (JPEG, PNG, TIFF) — run real OCR.
    const ocrResult = await runOcr(filePath);
    return { text: ocrResult.text, method: 'ocr', confidence: ocrResult.confidence };
  } catch (err) {
    logger.error('Text extraction error:', err);
    return { text: '', method: 'failed', confidence: 0 };
  }
}

// POST /api/v1/documents/upload
router.post('/upload', authenticate, upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { caseId, documentType = 'other', description } = req.body;

    // Reject files whose actual content doesn't match their claimed type
    // (e.g. a renamed .exe passed off as a .pdf).
    if (!verifyFileSignature(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      logger.warn(`Rejected upload with mismatched file signature: user=${req.user.id}, claimed type=${req.file.mimetype}`);
      return res.status(400).json({ success: false, message: 'File content does not match its type. Please upload a genuine PDF/image file.' });
    }

    // Extract text
    const { text, method, confidence } = await extractText(req.file.path, req.file.mimetype);

    const { rows: [doc] } = await query(
      `INSERT INTO documents (user_id, case_id, file_name, original_name, file_type, mime_type, 
        file_size, file_path, is_ocr_processed, ocr_text, ocr_confidence, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, caseId || null, req.file.filename, req.file.originalname,
       documentType, req.file.mimetype, req.file.size, req.file.path,
       text.length > 0, text, confidence, description || null]
    );

    audit(req, 'document.upload', { documentId: doc.id, fileType: req.file.mimetype });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      data: { document: doc, extractedText: text.substring(0, 500) + (text.length > 500 ? '...' : '') }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(error);
  }
});

// GET /api/v1/documents
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { caseId, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT d.*, c.title as case_title FROM documents d
               LEFT JOIN cases c ON c.id = d.case_id
               WHERE d.user_id = $1`;
    const params = [req.user.id];

    if (caseId) { params.push(caseId); sql += ` AND d.case_id = $${params.length}`; }
    if (type) { params.push(type); sql += ` AND d.file_type = $${params.length}`; }

    sql += ` ORDER BY d.uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/documents/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/documents/:id/text
router.get('/:id/text', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT ocr_text, file_name FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });
    res.json({ success: true, data: { text: rows[0].ocr_text, fileName: rows[0].file_name } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/documents/:id/file — securely stream the original uploaded file.
// Only the user who owns the document can access it (checked below), unlike
// a public static path which would have no such check.
router.get('/:id/file', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT file_path, mime_type, original_name FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });

    const { file_path, mime_type, original_name } = rows[0];
    if (!fs.existsSync(file_path)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server.' });
    }

    audit(req, 'document.view_file', { documentId: req.params.id });

    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${original_name}"`);
    fs.createReadStream(file_path).pipe(res);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/documents/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING file_path',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Document not found.' });
    
    // Delete file from disk
    if (rows[0].file_path && fs.existsSync(rows[0].file_path)) {
      fs.unlink(rows[0].file_path, () => {});
    }
    
    res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
