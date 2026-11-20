const { getDb } = require('../db');
const { conflict } = require('../utils/errors');
const { isUniqueConstraintError } = require('../utils/sqlite');

const COLUMNS = `id, job_id, candidate_id, resume_id, cover_letter, status, created_at, updated_at`;

function toApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    resumeId: row.resume_id,
    coverLetter: row.cover_letter,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createApplication({ jobId, candidateId, resumeId = null, coverLetter = null }) {
  const now = new Date().toISOString();
  try {
    const { lastInsertRowid } = getDb()
      .prepare(
        `INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`
      )
      .run(jobId, candidateId, resumeId, coverLetter, now, now);
    return getApplicationById(Number(lastInsertRowid));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict('Candidate has already applied to this job');
    }
    throw error;
  }
}

function getApplicationById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM applications WHERE id = ?`).get(id);
  return toApplication(row);
}

function updateApplicationStatus(id, status) {
  const now = new Date().toISOString();
  const { changes } = getDb()
    .prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, now, id);
  if (changes === 0) return null;
  return getApplicationById(id);
}

function listApplicationsByCandidate(candidateId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM applications WHERE candidate_id = ? ORDER BY id DESC`)
    .all(candidateId)
    .map(toApplication);
}

function listApplicationsByJob(jobId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM applications WHERE job_id = ? ORDER BY id DESC`)
    .all(jobId)
    .map(toApplication);
}

module.exports = {
  createApplication,
  getApplicationById,
  updateApplicationStatus,
  listApplicationsByCandidate,
  listApplicationsByJob,
};
