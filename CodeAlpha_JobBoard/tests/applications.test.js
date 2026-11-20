const test = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./helpers/testServer');
const { postJson, uploadResume } = require('./helpers/http');

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n');

async function createEmployerWithJob(baseUrl) {
  const employer = await postJson(baseUrl, '/api/employers', { companyName: 'Acme Corp', email: 'hr@acme.test' });
  const employerId = (await employer.json()).id;
  const job = await postJson(baseUrl, '/api/jobs', {
    employerId,
    title: 'Backend Developer',
    description: 'Build APIs with Express.',
  });
  return (await job.json()).id;
}

async function createCandidateWithResume(baseUrl, email) {
  const candidate = await postJson(baseUrl, '/api/candidates', { fullName: 'Ada Lovelace', email });
  const candidateId = (await candidate.json()).id;
  const uploaded = await uploadResume(baseUrl, candidateId, {
    filename: 'ada-resume.pdf',
    contentType: 'application/pdf',
    content: PDF_BYTES,
  });
  return { candidateId, resumeId: (await uploaded.json()).id };
}

test('POST /api/applications creates an application', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId, resumeId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');

    const res = await postJson(server.baseUrl, '/api/applications', {
      jobId,
      candidateId,
      resumeId,
      coverLetter: 'I would love to join.',
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.jobId, jobId);
    assert.equal(body.candidateId, candidateId);
    assert.equal(body.resumeId, resumeId);
    assert.equal(body.status, 'pending');
  } finally {
    await server.close();
  }
});

test('POST /api/applications returns 400 for invalid input', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');

    const missingJob = await postJson(server.baseUrl, '/api/applications', { candidateId });
    assert.equal(missingJob.status, 400);

    const badCandidate = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId: 'abc' });
    assert.equal(badCandidate.status, 400);
  } finally {
    await server.close();
  }
});

test('POST /api/applications returns 404 when the job or candidate does not exist', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');

    const missingJob = await postJson(server.baseUrl, '/api/applications', { jobId: 999, candidateId });
    assert.equal(missingJob.status, 404);
    assert.match((await missingJob.json()).error, /Job 999 not found/);

    const missingCandidate = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId: 999 });
    assert.equal(missingCandidate.status, 404);
    assert.match((await missingCandidate.json()).error, /Candidate 999 not found/);
  } finally {
    await server.close();
  }
});

test('POST /api/applications returns 400 when the resume belongs to another candidate', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    const other = await createCandidateWithResume(server.baseUrl, 'grace@example.test');

    const res = await postJson(server.baseUrl, '/api/applications', {
      jobId,
      candidateId,
      resumeId: other.resumeId,
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /does not belong/);
  } finally {
    await server.close();
  }
});

test('POST /api/applications returns 409 when the candidate already applied', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');

    await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });
    const duplicate = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });
    assert.equal(duplicate.status, 409);
    assert.match((await duplicate.json()).error, /already applied/);
  } finally {
    await server.close();
  }
});

test('GET /api/applications/:id fetches an application and returns 404 when missing', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    const created = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });
    const application = await created.json();

    const one = await fetch(`${server.baseUrl}/api/applications/${application.id}`);
    assert.equal(one.status, 200);
    assert.equal((await one.json()).status, 'pending');

    const missing = await fetch(`${server.baseUrl}/api/applications/999`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});

test('GET /api/candidates/:id/applications tracks a candidate applications', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });

    const list = await fetch(`${server.baseUrl}/api/candidates/${candidateId}/applications`);
    assert.equal(list.status, 200);
    const applications = await list.json();
    assert.equal(applications.length, 1);
    assert.equal(applications[0].jobId, jobId);

    const missing = await fetch(`${server.baseUrl}/api/candidates/999/applications`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});

test('PATCH /api/applications/:id/status updates status and notifies the employer', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    const created = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });
    const application = await created.json();

    const res = await fetch(`${server.baseUrl}/api/applications/${application.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shortlisted' }),
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.status, 'shortlisted');
    assert.notEqual(updated.updatedAt, application.updatedAt);

    const notifications = await fetch(`${server.baseUrl}/api/employers/1/notifications`);
    assert.equal(notifications.status, 200);
    const list = await notifications.json();
    assert.equal(list.length, 2);
    assert.match(list[0].message, /updated to "shortlisted"/);
    assert.match(list[1].message, /New application/);
  } finally {
    await server.close();
  }
});

test('PATCH /api/applications/:id/status returns 400 for an invalid status and creates no notification', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    const created = await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });
    const application = await created.json();

    const res = await fetch(`${server.baseUrl}/api/applications/${application.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'hired' }),
    });
    assert.equal(res.status, 400);

    const notifications = await fetch(`${server.baseUrl}/api/employers/1/notifications`);
    assert.equal((await notifications.json()).length, 1);
  } finally {
    await server.close();
  }
});

test('PATCH /api/applications/:id/status returns 404 for a missing application and 400 for an invalid id', async () => {
  const server = await startTestServer();
  try {
    const missing = await fetch(`${server.baseUrl}/api/applications/999/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    assert.equal(missing.status, 404);

    const invalid = await fetch(`${server.baseUrl}/api/applications/abc/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    assert.equal(invalid.status, 400);
  } finally {
    await server.close();
  }
});

test('GET /api/employers/:id/notifications returns 404 for a missing employer', async () => {
  const server = await startTestServer();
  try {
    const res = await fetch(`${server.baseUrl}/api/employers/999/notifications`);
    assert.equal(res.status, 404);
  } finally {
    await server.close();
  }
});

test('PATCH /api/notifications/:id/read marks a notification read', async () => {
  const server = await startTestServer();
  try {
    const jobId = await createEmployerWithJob(server.baseUrl);
    const { candidateId } = await createCandidateWithResume(server.baseUrl, 'ada@example.test');
    await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });

    const notifications = await (await fetch(`${server.baseUrl}/api/employers/1/notifications`)).json();
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].isRead, false);

    const res = await fetch(`${server.baseUrl}/api/notifications/${notifications[0].id}/read`, { method: 'PATCH' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).isRead, true);

    const missing = await fetch(`${server.baseUrl}/api/notifications/999/read`, { method: 'PATCH' });
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});
