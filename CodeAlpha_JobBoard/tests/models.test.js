const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestDb, destroyTestDb } = require('./helpers/testDb');
const { createEmployer, getEmployerById, listEmployers } = require('../src/models/employer');
const { createCandidate, getCandidateById, listCandidates } = require('../src/models/candidate');
const { createJob, getJobById, searchJobs } = require('../src/models/job');
const { createResume, getResumeById, listResumesByCandidate } = require('../src/models/resume');
const {
  createApplication,
  getApplicationById,
  listApplicationsByCandidate,
  listApplicationsByJob,
} = require('../src/models/application');

test('employer model stores and retrieves employers', () => {
  const { dir } = createTestDb();
  try {
    const created = createEmployer({
      companyName: 'Acme Corp',
      email: 'hr@acme.test',
      industry: 'Technology',
      location: 'Remote',
      website: 'https://acme.test',
    });
    assert.equal(created.id, 1);
    assert.equal(created.companyName, 'Acme Corp');
    assert.equal(created.createdAt.length, 24);

    assert.deepEqual(getEmployerById(created.id), created);
    assert.equal(getEmployerById(999), null);

    assert.throws(
      () => createEmployer({ companyName: 'Acme Again', email: 'hr@acme.test' }),
      /already exists/
    );
    assert.equal(listEmployers().length, 1);
  } finally {
    destroyTestDb(dir);
  }
});

test('candidate model stores and retrieves candidates', () => {
  const { dir } = createTestDb();
  try {
    const created = createCandidate({
      fullName: 'Ada Lovelace',
      email: 'ada@example.test',
      phone: '555-0100',
      headline: 'Backend Engineer',
      location: 'London',
    });
    assert.equal(created.id, 1);
    assert.equal(created.fullName, 'Ada Lovelace');

    assert.deepEqual(getCandidateById(created.id), created);
    assert.equal(getCandidateById(999), null);

    assert.throws(
      () => createCandidate({ fullName: 'Ada Again', email: 'ada@example.test' }),
      /already exists/
    );
    assert.equal(listCandidates().length, 1);
  } finally {
    destroyTestDb(dir);
  }
});

test('job model stores and retrieves jobs', () => {
  const { dir } = createTestDb();
  try {
    const employer = createEmployer({ companyName: 'Acme Corp', email: 'hr@acme.test' });
    const created = createJob({
      employerId: employer.id,
      title: 'Backend Developer',
      description: 'Build APIs with Express.',
      location: 'Remote',
      employmentType: 'full-time',
      salaryMin: 80000,
      salaryMax: 120000,
    });
    assert.equal(created.id, 1);
    assert.equal(created.employerId, employer.id);
    assert.equal(created.status, 'open');
    assert.equal(created.currency, 'USD');

    assert.deepEqual(getJobById(created.id), created);
    assert.equal(getJobById(999), null);
    assert.equal(searchJobs().length, 1);
  } finally {
    destroyTestDb(dir);
  }
});

test('resume model stores and retrieves resumes', () => {
  const { dir } = createTestDb();
  try {
    const candidate = createCandidate({ fullName: 'Ada Lovelace', email: 'ada@example.test' });
    const created = createResume({
      candidateId: candidate.id,
      fileName: 'ada-resume.pdf',
      storedName: 'resume-1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });
    assert.equal(created.id, 1);
    assert.equal(created.candidateId, candidate.id);
    assert.equal(created.sizeBytes, 1024);

    assert.deepEqual(getResumeById(created.id), created);
    assert.equal(getResumeById(999), null);
    assert.deepEqual(listResumesByCandidate(candidate.id), [created]);
    assert.deepEqual(listResumesByCandidate(999), []);
  } finally {
    destroyTestDb(dir);
  }
});

test('application model stores applications and rejects duplicates', () => {
  const { dir } = createTestDb();
  try {
    const employer = createEmployer({ companyName: 'Acme Corp', email: 'hr@acme.test' });
    const job = createJob({ employerId: employer.id, title: 'Backend Developer', description: 'Build APIs.' });
    const candidate = createCandidate({ fullName: 'Ada Lovelace', email: 'ada@example.test' });
    const resume = createResume({
      candidateId: candidate.id,
      fileName: 'ada-resume.pdf',
      storedName: 'resume-1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });

    const created = createApplication({
      jobId: job.id,
      candidateId: candidate.id,
      resumeId: resume.id,
      coverLetter: 'I would love to join.',
    });
    assert.equal(created.status, 'pending');
    assert.equal(created.jobId, job.id);
    assert.equal(created.resumeId, resume.id);

    assert.deepEqual(getApplicationById(created.id), created);
    assert.equal(getApplicationById(999), null);
    assert.deepEqual(listApplicationsByCandidate(candidate.id), [created]);
    assert.deepEqual(listApplicationsByJob(job.id), [created]);

    assert.throws(
      () => createApplication({ jobId: job.id, candidateId: candidate.id }),
      /already applied/
    );
  } finally {
    destroyTestDb(dir);
  }
});
