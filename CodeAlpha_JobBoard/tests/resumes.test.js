const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.MAX_RESUME_BYTES = '1024';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'jobboard-resumes-'));

const { startTestServer } = require('./helpers/testServer');
const { postJson, uploadResume } = require('./helpers/http');

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n');

async function createCandidate(baseUrl) {
  const res = await postJson(baseUrl, '/api/candidates', { fullName: 'Ada Lovelace', email: 'ada@example.test' });
  return (await res.json()).id;
}

test('POST /api/candidates/:id/resumes uploads a PDF resume', async () => {
  const server = await startTestServer();
  try {
    const candidateId = await createCandidate(server.baseUrl);
    const res = await uploadResume(server.baseUrl, candidateId, {
      filename: 'ada-resume.pdf',
      contentType: 'application/pdf',
      content: PDF_BYTES,
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.candidateId, candidateId);
    assert.equal(body.fileName, 'ada-resume.pdf');
    assert.equal(body.mimeType, 'application/pdf');
    assert.equal(body.sizeBytes, PDF_BYTES.length);
    assert.match(body.storedName, /\.pdf$/);
    assert.equal(fs.existsSync(path.join(process.env.UPLOAD_DIR, body.storedName)), true);
  } finally {
    await server.close();
  }
});

test('POST /api/candidates/:id/resumes returns 400 when no file is sent', async () => {
  const server = await startTestServer();
  try {
    const candidateId = await createCandidate(server.baseUrl);
    const form = new FormData();
    const res = await fetch(`${server.baseUrl}/api/candidates/${candidateId}/resumes`, {
      method: 'POST',
      body: form,
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /required/);
  } finally {
    await server.close();
  }
});

test('POST /api/candidates/:id/resumes returns 400 for a non-resume file type', async () => {
  const server = await startTestServer();
  try {
    const candidateId = await createCandidate(server.baseUrl);
    const res = await uploadResume(server.baseUrl, candidateId, {
      filename: 'notes.txt',
      contentType: 'text/plain',
      content: Buffer.from('hello'),
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /PDF, DOC or DOCX/);
  } finally {
    await server.close();
  }
});

test('POST /api/candidates/:id/resumes returns 400 when the file exceeds MAX_RESUME_BYTES', async () => {
  const server = await startTestServer();
  try {
    const candidateId = await createCandidate(server.baseUrl);
    const res = await uploadResume(server.baseUrl, candidateId, {
      filename: 'big.pdf',
      contentType: 'application/pdf',
      content: Buffer.alloc(1025),
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /exceeds the maximum/);
  } finally {
    await server.close();
  }
});

test('POST /api/candidates/:id/resumes returns 404 when the candidate does not exist', async () => {
  const server = await startTestServer();
  try {
    const res = await uploadResume(server.baseUrl, 999, {
      filename: 'ada-resume.pdf',
      contentType: 'application/pdf',
      content: PDF_BYTES,
    });
    assert.equal(res.status, 404);
    assert.match((await res.json()).error, /Candidate 999 not found/);
  } finally {
    await server.close();
  }
});

test('GET /api/candidates/:id/resumes lists resumes and GET /api/resumes/:id fetches one', async () => {
  const server = await startTestServer();
  try {
    const candidateId = await createCandidate(server.baseUrl);
    const uploaded = await uploadResume(server.baseUrl, candidateId, {
      filename: 'ada-resume.pdf',
      contentType: 'application/pdf',
      content: PDF_BYTES,
    });
    const resume = await uploaded.json();

    const list = await fetch(`${server.baseUrl}/api/candidates/${candidateId}/resumes`);
    assert.equal(list.status, 200);
    const resumes = await list.json();
    assert.equal(resumes.length, 1);
    assert.equal(resumes[0].id, resume.id);

    const one = await fetch(`${server.baseUrl}/api/resumes/${resume.id}`);
    assert.equal(one.status, 200);
    assert.equal((await one.json()).fileName, 'ada-resume.pdf');

    const missing = await fetch(`${server.baseUrl}/api/resumes/999`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});

test.after(() => {
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});
