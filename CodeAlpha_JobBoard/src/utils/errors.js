class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

function badRequest(message) {
  return new AppError(400, message);
}

function notFound(message = 'Resource not found') {
  return new AppError(404, message);
}

function conflict(message) {
  return new AppError(409, message);
}

module.exports = { AppError, badRequest, notFound, conflict };
