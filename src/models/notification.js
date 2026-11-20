const { getDb } = require('../db');

const COLUMNS = 'id, employer_id, application_id, message, is_read, created_at';

function toNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    employerId: row.employer_id,
    applicationId: row.application_id,
    message: row.message,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function createNotification({ employerId, applicationId, message }) {
  const createdAt = new Date().toISOString();
  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO notifications (employer_id, application_id, message, is_read, created_at)
       VALUES (?, ?, ?, 0, ?)`
    )
    .run(employerId, applicationId, message, createdAt);
  return getNotificationById(Number(lastInsertRowid));
}

function getNotificationById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM notifications WHERE id = ?`).get(id);
  return toNotification(row);
}

function listNotificationsByEmployer(employerId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM notifications WHERE employer_id = ? ORDER BY id DESC`)
    .all(employerId)
    .map(toNotification);
}

function markNotificationRead(id) {
  const { changes } = getDb()
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')
    .run(id);
  if (changes === 0) return null;
  return getNotificationById(id);
}

module.exports = { createNotification, getNotificationById, listNotificationsByEmployer, markNotificationRead };
