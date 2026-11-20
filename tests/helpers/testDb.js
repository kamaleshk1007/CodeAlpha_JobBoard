const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initDb, closeDb } = require('../../src/db');

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobboard-test-'));
  const dbPath = path.join(dir, 'test.db');
  initDb(dbPath);
  return { dir, dbPath };
}

function destroyTestDb(dir) {
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { createTestDb, destroyTestDb };
