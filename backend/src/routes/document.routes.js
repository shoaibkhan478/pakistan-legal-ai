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
const { authenticate } = require('../middleware/auth.middleware');
const { query } = require('../config/database');
const logger = require('../utils/logger');

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
 * Extract text from uploaded file
 */
async function extractText(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      return { text: data.text, method: 'pdf-parse', confidence: 95 };
    }
    // For images, return placeholder (Tesseract would be called in production)
    return { text: '', method: 'ocr-pending', confidence: 0 };
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
