const test = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./helpers/testServer');

function postEmployer(baseUrl, body) {
  return fetch(`${baseUrl}/api/employers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/employers creates an employer', async () => {
  const server = await startTestServer();
  try {
    const res = await postEmployer(server.baseUrl, {
      companyName: 'Acme Corp',
      email: 'hr@acme.test',
      industry: 'Technology',
      location: 'Remote',
      website: 'https://acme.test',
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.id, 1);
    assert.equal(body.companyName, 'Acme Corp');
    assert.equal(body.email, 'hr@acme.test');
    assert.equal(body.website, 'https://acme.test');
  } finally {
    await server.close();
  }
});

test('POST /api/employers returns 400 for invalid input', async () => {
  const server = await startTestServer();
  try {
    const missingName = await postEmployer(server.baseUrl, { email: 'hr@acme.test' });
    assert.equal(missingName.status, 400);

    const badEmail = await postEmployer(server.baseUrl, { companyName: 'Acme', email: 'not-an-email' });
    assert.equal(badEmail.status, 400);

    const badWebsite = await postEmployer(server.baseUrl, {
      companyName: 'Acme',
      email: 'hr@acme.test',
      website: 'not-a-url',
    });
    assert.equal(badWebsite.status, 400);
  } finally {
    await server.close();
  }
});

test('POST /api/employers returns 409 for a duplicate email', async () => {
  const server = await startTestServer();
  try {
    await postEmployer(server.baseUrl, { companyName: 'Acme Corp', email: 'hr@acme.test' });
    const duplicate = await postEmployer(server.baseUrl, { companyName: 'Acme Two', email: 'hr@acme.test' });
    assert.equal(duplicate.status, 409);
    assert.match((await duplicate.json()).error, /already exists/);
  } finally {
    await server.close();
  }
});

test('POST /api/employers returns 400 for malformed JSON', async () => {
  const server = await startTestServer();
  try {
    const res = await fetch(`${server.baseUrl}/api/employers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
  } finally {
    await server.close();
  }
});

test('GET /api/employers lists employers and GET /api/employers/:id fetches one', async () => {
  const server = await startTestServer();
  try {
    await postEmployer(server.baseUrl, { companyName: 'Acme Corp', email: 'hr@acme.test' });

    const list = await fetch(`${server.baseUrl}/api/employers`);
    assert.equal(list.status, 200);
    const employers = await list.json();
    assert.equal(employers.length, 1);
    assert.equal(employers[0].companyName, 'Acme Corp');

    const one = await fetch(`${server.baseUrl}/api/employers/1`);
    assert.equal(one.status, 200);
    assert.equal((await one.json()).email, 'hr@acme.test');
  } finally {
    await server.close();
  }
});

test('GET /api/employers/:id returns 404 for missing and 400 for invalid id', async () => {
  const server = await startTestServer();
  try {
    const missing = await fetch(`${server.baseUrl}/api/employers/999`);
    assert.equal(missing.status, 404);

    const invalid = await fetch(`${server.baseUrl}/api/employers/abc`);
    assert.equal(invalid.status, 400);
  } finally {
    await server.close();
  }
});
