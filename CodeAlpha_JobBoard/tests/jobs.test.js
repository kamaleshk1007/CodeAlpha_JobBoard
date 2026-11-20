const test = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./helpers/testServer');
const { postJson } = require('./helpers/http');

async function createEmployer(baseUrl) {
  const res = await postJson(baseUrl, '/api/employers', { companyName: 'Acme Corp', email: 'hr@acme.test' });
  return (await res.json()).id;
}

test('POST /api/jobs creates a job', async () => {
  const server = await startTestServer();
  try {
    const employerId = await createEmployer(server.baseUrl);
    const res = await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Backend Developer',
      description: 'Build APIs with Express.',
      location: 'Remote',
      employmentType: 'full-time',
      salaryMin: 80000,
      salaryMax: 120000,
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.employerId, employerId);
    assert.equal(body.title, 'Backend Developer');
    assert.equal(body.employmentType, 'full-time');
    assert.equal(body.status, 'open');
    assert.equal(body.currency, 'USD');
  } finally {
    await server.close();
  }
});

test('POST /api/jobs returns 400 for invalid input', async () => {
  const server = await startTestServer();
  try {
    const employerId = await createEmployer(server.baseUrl);

    const missingTitle = await postJson(server.baseUrl, '/api/jobs', { employerId, description: 'Build.' });
    assert.equal(missingTitle.status, 400);

    const badEmployerId = await postJson(server.baseUrl, '/api/jobs', {
      employerId: 'abc',
      title: 'Backend Developer',
      description: 'Build.',
    });
    assert.equal(badEmployerId.status, 400);

    const badType = await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Backend Developer',
      description: 'Build.',
      employmentType: 'freelance',
    });
    assert.equal(badType.status, 400);

    const badSalary = await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Backend Developer',
      description: 'Build.',
      salaryMin: 120000,
      salaryMax: 80000,
    });
    assert.equal(badSalary.status, 400);
  } finally {
    await server.close();
  }
});

test('POST /api/jobs returns 404 when the employer does not exist', async () => {
  const server = await startTestServer();
  try {
    const res = await postJson(server.baseUrl, '/api/jobs', {
      employerId: 999,
      title: 'Backend Developer',
      description: 'Build.',
    });
    assert.equal(res.status, 404);
    assert.match((await res.json()).error, /Employer 999 not found/);
  } finally {
    await server.close();
  }
});

test('GET /api/jobs lists jobs and GET /api/jobs/:id fetches one', async () => {
  const server = await startTestServer();
  try {
    const employerId = await createEmployer(server.baseUrl);
    await postJson(server.baseUrl, '/api/jobs', { employerId, title: 'Backend Developer', description: 'Build.' });

    const list = await fetch(`${server.baseUrl}/api/jobs`);
    assert.equal(list.status, 200);
    const jobs = await list.json();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Backend Developer');

    const one = await fetch(`${server.baseUrl}/api/jobs/1`);
    assert.equal(one.status, 200);
    assert.equal((await one.json()).employerId, employerId);
  } finally {
    await server.close();
  }
});

test('GET /api/jobs/:id returns 404 for missing and 400 for invalid id', async () => {
  const server = await startTestServer();
  try {
    const missing = await fetch(`${server.baseUrl}/api/jobs/999`);
    assert.equal(missing.status, 404);

    const invalid = await fetch(`${server.baseUrl}/api/jobs/abc`);
    assert.equal(invalid.status, 400);
  } finally {
    await server.close();
  }
});

test('GET /api/jobs filters by keyword, location, employment type and salary range', async () => {
  const server = await startTestServer();
  try {
    const employerId = await createEmployer(server.baseUrl);
    await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Backend Developer',
      description: 'Node and Express APIs',
      location: 'Remote',
      employmentType: 'full-time',
      salaryMin: 80000,
      salaryMax: 120000,
    });
    await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Frontend Developer',
      description: 'React interfaces',
      location: 'New York',
      employmentType: 'contract',
      salaryMin: 60000,
      salaryMax: 90000,
    });
    await postJson(server.baseUrl, '/api/jobs', {
      employerId,
      title: 'Data Engineer',
      description: 'Python pipelines',
      location: 'Remote',
      employmentType: 'part-time',
    });

    const search = async (query) => (await fetch(`${server.baseUrl}/api/jobs?${query}`)).json();

    assert.deepEqual((await search('keyword=backend')).map((job) => job.title), ['Backend Developer']);
    assert.deepEqual((await search('keyword=react')).map((job) => job.title), ['Frontend Developer']);
    assert.deepEqual((await search('location=remote')).map((job) => job.title), ['Data Engineer', 'Backend Developer']);
    assert.deepEqual((await search('employmentType=contract')).map((job) => job.title), ['Frontend Developer']);
    assert.deepEqual((await search('salaryMin=70000')).map((job) => job.title), ['Frontend Developer', 'Backend Developer']);
    assert.deepEqual((await search('salaryMax=70000')).map((job) => job.title), ['Frontend Developer']);
    assert.deepEqual((await search('salaryMin=50000&salaryMax=100000')).map((job) => job.title), ['Frontend Developer', 'Backend Developer']);
  } finally {
    await server.close();
  }
});

test('GET /api/jobs returns 400 for invalid filters', async () => {
  const server = await startTestServer();
  try {
    const badSalary = await fetch(`${server.baseUrl}/api/jobs?salaryMin=-1`);
    assert.equal(badSalary.status, 400);

    const badType = await fetch(`${server.baseUrl}/api/jobs?employmentType=freelance`);
    assert.equal(badType.status, 400);

    const reversed = await fetch(`${server.baseUrl}/api/jobs?salaryMin=100000&salaryMax=50000`);
    assert.equal(reversed.status, 400);
  } finally {
    await server.close();
  }
});

test('GET /api/jobs/:id/applications lists a job applications and returns 404 for missing job', async () => {
  const server = await startTestServer();
  try {
    const employerId = await createEmployer(server.baseUrl);
    const job = await postJson(server.baseUrl, '/api/jobs', { employerId, title: 'Backend Developer', description: 'Build.' });
    const jobId = (await job.json()).id;
    const candidate = await postJson(server.baseUrl, '/api/candidates', { fullName: 'Ada Lovelace', email: 'ada@example.test' });
    const candidateId = (await candidate.json()).id;
    await postJson(server.baseUrl, '/api/applications', { jobId, candidateId });

    const list = await fetch(`${server.baseUrl}/api/jobs/${jobId}/applications`);
    assert.equal(list.status, 200);
    const applications = await list.json();
    assert.equal(applications.length, 1);
    assert.equal(applications[0].jobId, jobId);

    const missing = await fetch(`${server.baseUrl}/api/jobs/999/applications`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});
