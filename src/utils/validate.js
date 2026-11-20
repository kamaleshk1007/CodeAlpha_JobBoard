const { badRequest } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireString(body, field) {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`"${field}" is required and must be a non-empty string`);
  }
  return value.trim();
}

function requireEmail(body, field) {
  const value = requireString(body, field);
  if (!EMAIL_PATTERN.test(value)) {
    throw badRequest(`"${field}" must be a valid email address`);
  }
  return value;
}

function optionalString(body, field) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest(`"${field}" must be a string`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function optionalUrl(body, field) {
  const value = optionalString(body, field);
  if (value === null) return null;
  try {
    new URL(value);
  } catch {
    throw badRequest(`"${field}" must be a valid URL`);
  }
  return value;
}

function requireId(body, field) {
  const value = Number(body[field]);
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest(`"${field}" is required and must be a positive integer`);
  }
  return value;
}

function optionalInteger(body, field, { min = null } = {}) {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || (min !== null && number < min)) {
    const suffix = min !== null ? ` greater than or equal to ${min}` : '';
    throw badRequest(`"${field}" must be an integer${suffix}`);
  }
  return number;
}

function optionalEnum(body, field, allowed, defaultValue = null) {
  const value = body[field];
  if (value === undefined || value === null || value === '') return defaultValue;
  if (!allowed.includes(value)) {
    throw badRequest(`"${field}" must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function requireEnum(body, field, allowed) {
  const value = body[field];
  if (!allowed.includes(value)) {
    throw badRequest(`"${field}" is required and must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function parseIdParam(value, field = 'id') {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw badRequest(`"${field}" must be a positive integer`);
  }
  return number;
}

module.exports = {
  requireString,
  requireEmail,
  optionalString,
  optionalUrl,
  requireId,
  optionalInteger,
  optionalEnum,
  requireEnum,
  parseIdParam,
};
