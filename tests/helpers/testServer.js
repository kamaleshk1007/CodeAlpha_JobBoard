const { createApp } = require('../../src/app');
const { createTestDb, destroyTestDb } = require('./testDb');

async function startTestServer() {
  const { dir } = createTestDb();
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      destroyTestDb(dir);
    },
  };
}

module.exports = { startTestServer };
