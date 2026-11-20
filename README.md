# CodeAlpha Job Board Platform

Backend for a job board: employers post jobs, candidates upload resumes and apply,
and employers track applications and receive notifications.

- Express.js HTTP API
- SQLite database through Node's built-in `node:sqlite` (no native build step)
- Multipart resume uploads handled by `multer`
- Configuration read from environment variables (via `dotenv`)

## Requirements

- Node.js 22.5 or newer (for the built-in `node:sqlite` module)
- npm

## Setup

```sh
npm install
```

Copy the example environment file and adjust it if needed:

```sh
cp .env.example .env
```

`cp` is available in most Unix-like shells. On Windows, run:

```sh
Copy-Item .env.example .env
```

The server also works without a `.env` file: the defaults below are used.

## Run

```sh
npm start
```

The API listens on `http://localhost:3000` by default. For development with
automatic restarts on file changes:

```sh
npm run dev
```

## Test and build

```sh
npm test
```

Runs the test suite with Node's built-in test runner. Tests use throwaway
databases and temporary upload directories, so they do not touch the real data.

```sh
npm run build
```

Compiles every JavaScript file under `src/`, `scripts/` and `tests/` to catch
syntax errors.

## Environment variables

| Variable           | Default           | Description                                   |
| ------------------ | ----------------- | --------------------------------------------- |
| `PORT`             | `3000`            | HTTP port                                     |
| `DB_PATH`          | `data/jobboard.db`| SQLite database file path                     |
| `UPLOAD_DIR`       | `uploads`         | Directory where resume files are stored       |
| `MAX_RESUME_BYTES` | `5242880`         | Maximum resume size (5 MB)                    |

`.env` is ignored by git, as are `node_modules/`, `data/` and `uploads/`.

## Project structure

```
src/
  app.js                Express app factory
  server.js             Loads env, opens the database, starts the server
  db/index.js           node:sqlite connection, schema bootstrap, transactions
  db/schema.sql        Tables: employers, candidates, jobs, resumes,
                       applications, notifications
  models/               Data access and row mapping (camelCase JSON)
  routes/               HTTP route handlers
  middleware/           Error handling, entity lookups, resume upload
  services/             Application + notification side effects
  utils/                Validation helpers and error types
tests/                  node:test suites (models, routes, uploads, server)
scripts/build.js        Syntax-compiles all JavaScript files
```

## API reference

All request and response bodies are JSON unless stated otherwise.

### Health

| Method | Path      | Description        |
| ------ | --------- | ------------------ |
| GET    | `/health` | Returns `{ "status": "ok" }` |

### Employers

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| POST   | `/api/employers`                | Create an employer                       |
| GET    | `/api/employers`                | List employers                           |
| GET    | `/api/employers/:id`            | Get one employer (404 if missing)        |
| GET    | `/api/employers/:id/notifications` | List employer notifications (404 if missing) |

Create an employer:

```sh
curl -X POST http://localhost:3000/api/employers \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Acme Corp","email":"hr@acme.test","industry":"Technology","location":"Remote","website":"https://acme.test"}'
```

`companyName` and a valid `email` are required. A repeated email returns `409`.

### Jobs

| Method | Path                        | Description                                            |
| ------ | --------------------------- | ------------------------------------------------------ |
| POST   | `/api/jobs`                 | Create a job                                           |
| GET    | `/api/jobs`                 | Search jobs with filters                               |
| GET    | `/api/jobs/:id`             | Get one job (404 if missing)                           |
| GET    | `/api/jobs/:id/applications`| List applications for a job (404 if job missing)       |

Create a job:

```sh
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"employerId":1,"title":"Backend Developer","description":"Build APIs with Express.","location":"Remote","employmentType":"full-time","salaryMin":80000,"salaryMax":120000}'
```

`employerId`, `title` and `description` are required. `employmentType` must be
`full-time`, `part-time`, `contract` or `internship`. `salaryMin` must not be
greater than `salaryMax`. A missing employer returns `404`.

Search filters (all optional, combined with `AND`):

| Query            | Meaning                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `keyword`        | Matches title or description (case-insensitive)                    |
| `location`       | Matches location (partial, case-insensitive)                       |
| `employmentType` | Exact match, one of the four allowed types                         |
| `salaryMin`      | Jobs whose advertised maximum salary is at least this value        |
| `salaryMax`      | Jobs whose advertised minimum salary is at most this value         |

```sh
curl "http://localhost:3000/api/jobs?keyword=backend&location=remote&employmentType=full-time&salaryMin=70000"
```

Invalid filter values return `400`. Jobs with no salary are excluded when a
salary filter is present.

### Candidates

| Method | Path                             | Description                                  |
| ------ | -------------------------------- | -------------------------------------------- |
| POST   | `/api/candidates`                | Create a candidate                           |
| GET    | `/api/candidates`                | List candidates                              |
| GET    | `/api/candidates/:id`            | Get one candidate (404 if missing)           |
| POST   | `/api/candidates/:id/resumes`    | Upload a resume (multipart field `resume`)   |
| GET    | `/api/candidates/:id/resumes`    | List a candidate's resumes (404 if missing)  |
| GET    | `/api/candidates/:id/applications` | List a candidate's applications (404 if missing) |

Create a candidate:

```sh
curl -X POST http://localhost:3000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.test","headline":"Backend Engineer","location":"London"}'
```

`fullName` and a valid `email` are required. A repeated email returns `409`.

Upload a resume (PDF, DOC or DOCX, at most `MAX_RESUME_BYTES`):

```sh
curl -X POST http://localhost:3000/api/candidates/1/resumes \
  -F "resume=@ada-resume.pdf;type=application/pdf"
```

A missing file, a disallowed type or an oversized file returns `400`. A missing
candidate returns `404`.

### Resumes

| Method | Path              | Description                     |
| ------ | ----------------- | ------------------------------- |
| GET    | `/api/resumes/:id`| Get resume metadata (404 if missing) |

### Applications

| Method | Path                            | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| POST   | `/api/applications`             | Apply for a job                          |
| GET    | `/api/applications/:id`         | Get one application (404 if missing)     |
| PATCH  | `/api/applications/:id/status`  | Update application status                |

Apply for a job:

```sh
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"jobId":1,"candidateId":1,"resumeId":1,"coverLetter":"I would love to join."}'
```

`jobId` and `candidateId` are required. A missing job or candidate returns `404`.
Applying twice for the same job returns `409`. `resumeId`, when present, must
belong to the given candidate. A successful application creates a notification
for the job's employer.

Update status:

```sh
curl -X PATCH http://localhost:3000/api/applications/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"shortlisted"}'
```

Allowed statuses: `pending`, `reviewed`, `shortlisted`, `rejected`, `accepted`.
An invalid status returns `400`; a missing application returns `404`. Each
successful change creates a notification for the employer.

### Notifications

| Method | Path                          | Description                       |
| ------ | ----------------------------- | --------------------------------- |
| PATCH  | `/api/notifications/:id/read` | Mark a notification as read       |

```sh
curl -X PATCH http://localhost:3000/api/notifications/1/read
```

A missing notification returns `404`.

## Status codes

- `200` OK
- `201` Created
- `400` Invalid input (validation, malformed JSON, rejected upload, invalid filter)
- `404` Resource not found
- `409` Conflict (duplicate email, duplicate application)

## Notes

- There is no authentication or authorization: callers identify the employer,
  candidate or job by id in the request. Authentication was not part of the task
  requirements.
- The optional admin panel and reporting endpoints are not implemented.
