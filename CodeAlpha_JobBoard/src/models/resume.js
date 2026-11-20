const { getDb } = require('../db');
const { conflict } = require('../utils/errors');
const { isUniqueConstraintError } = require('../utils/sqlite');

const COLUMNS = 'id, candidate_id, file_name, stored_name, mime_type, size_bytes, created_at';

function toResume(row) {
  if (!row) return null;
  return {
    id: row.id,
    candidateId: row.candidate_id,
    fileName: row.file_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function createResume({ candidateId, fileName, storedName, mimeType, sizeBytes }) {
  const createdAt = new Date().toISOString();
  try {
    const { lastInsertRowid } = getDb()
      .prepare(
        `INSERT INTO resumes (candidate_id, file_name, stored_name, mime_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(candidateId, fileName, storedName, mimeType, sizeBytes, createdAt);
    return getResumeById(Number(lastInsertRowid));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict(`Resume file "${storedName}" has already been uploaded`);
    }
    throw error;
  }
}

function getResumeById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM resumes WHERE id = ?`).get(id);
  return toResume(row);
}

function listResumesByCandidate(candidateId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM resumes WHERE candidate_id = ? ORDER BY id DESC`)
    .all(candidateId)
    .map(toResume);
}

module.exports = { createResume, getResumeById, listResumesByCandidate };
