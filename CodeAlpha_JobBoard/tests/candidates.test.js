const test = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./helpers/testServer');
const { postJson } = require('./helpers/http');

test('POST /api/candidates creates a candidate', async () => {
  const server = await startTestServer();
  try {
    const res = await postJson(server.baseUrl, '/api/candidates', {
      fullName: 'Ada Lovelace',
      email: 'ada@example.test',
      phone: '555-0100',
      headline: 'Backend Engineer',
      location: 'London',
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.id, 1);
    assert.equal(body.fullName, 'Ada Lovelace');
    assert.equal(body.headline, 'Backend Engineer');
  } finally {
    await server.close();
  }
});

test('POST /api/candidates returns 400 for invalid input', async () => {
  const server = await startTestServer();
  try {
    const missingName = await postJson(server.baseUrl, '/api/candidates', { email: 'ada@example.test' });
    assert.equal(missingName.status, 400);

    const badEmail = await postJson(server.baseUrl, '/api/candidates', { fullName: 'Ada', email: 'nope' });
    assert.equal(badEmail.status, 400);
  } finally {
    await server.close();
  }
});

test('POST /api/candidates returns 409 for a duplicate email', async () => {
  const server = await startTestServer();
  try {
    await postJson(server.baseUrl, '/api/candidates', { fullName: 'Ada Lovelace', email: 'ada@example.test' });
    const duplicate = await postJson(server.baseUrl, '/api/candidates', { fullName: 'Ada Again', email: 'ada@example.test' });
    assert.equal(duplicate.status, 409);
    assert.match((await duplicate.json()).error, /already exists/);
  } finally {
    await server.close();
  }
});

test('GET /api/candidates lists candidates and GET /api/candidates/:id fetches one', async () => {
  const server = await startTestServer();
  try {
    await postJson(server.baseUrl, '/api/candidates', { fullName: 'Ada Lovelace', email: 'ada@example.test' });

    const list = await fetch(`${server.baseUrl}/api/candidates`);
    assert.equal(list.status, 200);
    const candidates = await list.json();
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].fullName, 'Ada Lovelace');

    const one = await fetch(`${server.baseUrl}/api/candidates/1`);
    assert.equal(one.status, 200);
    assert.equal((await one.json()).email, 'ada@example.test');
  } finally {
    await server.close();
  }
});

test('GET /api/candidates/:id returns 404 for missing and 400 for invalid id', async () => {
  const server = await startTestServer();
  try {
    const missing = await fetch(`${server.baseUrl}/api/candidates/999`);
    assert.equal(missing.status, 404);

    const invalid = await fetch(`${server.baseUrl}/api/candidates/abc`);
    assert.equal(invalid.status, 400);
  } finally {
    await server.close();
  }
});
