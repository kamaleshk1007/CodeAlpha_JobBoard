PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  industry     TEXT,
  location     TEXT,
  website      TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT,
  headline   TEXT,
  location   TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id     INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full-time',
  salary_min      INTEGER,
  salary_max      INTEGER,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  resume_id    INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  UNIQUE (job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id    INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  message        TEXT NOT NULL,
  is_read        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employer ON notifications(employer_id);
