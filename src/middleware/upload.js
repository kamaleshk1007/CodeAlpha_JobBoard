const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { badRequest } = require('../utils/errors');

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_RESUME_BYTES = Number(process.env.MAX_RESUME_BYTES) || 5 * 1024 * 1024;

function uploadDir() {
  return process.env.UPLOAD_DIR || 'uploads';
}

function validateResumeFile(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(badRequest('Resume must be a PDF, DOC or DOCX file'));
  }
  return callback(null, true);
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdirSync(uploadDir(), { recursive: true });
    callback(null, uploadDir());
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const uploadResume = multer({
  storage,
  fileFilter: validateResumeFile,
  limits: { fileSize: MAX_RESUME_BYTES, files: 1 },
});

module.exports = { uploadResume };
