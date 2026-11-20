const { AppError } = require('../utils/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Resume exceeds the maximum allowed size' });
  }
  if (error.name === 'MulterError') {
    return res.status(400).json({ error: `Resume upload failed: ${error.message}` });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };
