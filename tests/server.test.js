const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');

test('app boots and responds to health and unknown routes', async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const missing = await fetch(`${baseUrl}/nope`);
    assert.equal(missing.status, 404);
    assert.match((await missing.json()).error, /Not found/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
