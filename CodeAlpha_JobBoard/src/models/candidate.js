const { getDb } = require('../db');
const { conflict } = require('../utils/errors');
const { isUniqueConstraintError } = require('../utils/sqlite');

const COLUMNS = 'id, full_name, email, phone, headline, location, created_at';

function toCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    headline: row.headline,
    location: row.location,
    createdAt: row.created_at,
  };
}

function createCandidate({ fullName, email, phone = null, headline = null, location = null }) {
  const createdAt = new Date().toISOString();
  try {
    const { lastInsertRowid } = getDb()
      .prepare(
        `INSERT INTO candidates (full_name, email, phone, headline, location, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(fullName, email, phone, headline, location, createdAt);
    return getCandidateById(Number(lastInsertRowid));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict(`Candidate with email "${email}" already exists`);
    }
    throw error;
  }
}

function getCandidateById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM candidates WHERE id = ?`).get(id);
  return toCandidate(row);
}

function listCandidates() {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM candidates ORDER BY id`)
    .all()
    .map(toCandidate);
}

module.exports = { createCandidate, getCandidateById, listCandidates };
