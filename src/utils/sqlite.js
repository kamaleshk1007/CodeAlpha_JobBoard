function isUniqueConstraintError(error) {
  return Boolean(error) && /UNIQUE constraint failed/i.test(error.message || '');
}

module.exports = { isUniqueConstraintError };
