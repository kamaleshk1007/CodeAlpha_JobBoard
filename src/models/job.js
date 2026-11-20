const { getDb } = require('../db');

const COLUMNS = `id, employer_id, title, description, location, employment_type,
  salary_min, salary_max, currency, status, created_at, updated_at`;

function toJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    location: row.location,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createJob({
  employerId,
  title,
  description,
  location = null,
  employmentType = 'full-time',
  salaryMin = null,
  salaryMax = null,
  currency = 'USD',
  status = 'open',
}) {
  const now = new Date().toISOString();
  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO jobs
         (employer_id, title, description, location, employment_type, salary_min, salary_max, currency, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      employerId,
      title,
      description,
      location,
      employmentType,
      salaryMin,
      salaryMax,
      currency,
      status,
      now,
      now
    );
  return getJobById(Number(lastInsertRowid));
}

function getJobById(id) {
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM jobs WHERE id = ?`).get(id);
  return toJob(row);
}

function searchJobs({ keyword = null, location = null, employmentType = null, salaryMin = null, salaryMax = null } = {}) {
  const conditions = [];
  const params = [];

  if (keyword) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (employmentType) {
    conditions.push('employment_type = ?');
    params.push(employmentType);
  }
  if (salaryMin !== null) {
    conditions.push('(salary_max IS NOT NULL AND salary_max >= ?)');
    params.push(salaryMin);
  }
  if (salaryMax !== null) {
    conditions.push('(salary_min IS NOT NULL AND salary_min <= ?)');
    params.push(salaryMax);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM jobs ${where} ORDER BY id DESC`)
    .all(...params)
    .map(toJob);
}

module.exports = { createJob, getJobById, searchJobs };
