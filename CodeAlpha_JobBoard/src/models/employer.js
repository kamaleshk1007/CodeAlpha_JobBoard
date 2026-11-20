const { getDb } = require('../db');
const { conflict } = require('../utils/errors');
const { isUniqueConstraintError } = require('../utils/sqlite');

const COLUMNS = 'id, company_name, email, industry, location, website, created_at';

function toEmployer(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    email: row.email,
    industry: row.industry,
    location: row.location,
    website: row.website,
    createdAt: row.created_at,
  };
}

function createEmployer({ companyName, email, industry = null, location = null, website = null }) {
  const createdAt = new Date().toISOString();
  try {
    const { lastInsertRowid } = getDb()
      .prepare(
        `INSERT INTO employers (company_name, email, industry, location, website, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(companyName, email, industry, location, website, createdAt);
    return getEmployerById(Number(lastInsertRowid));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict(`Employer with email "${email}" already exists`);
    }
    throw error;
  }
}

function getEmployerById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM employers WHERE id = ?`).get(id);
  return toEmployer(row);
}

function listEmployers() {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM employers ORDER BY id`)
    .all()
    .map(toEmployer);
}

module.exports = { createEmployer, getEmployerById, listEmployers };
