require('dotenv').config();

const { createApp } = require('./app');
const { initDb } = require('./db');

const port = Number(process.env.PORT) || 3000;

initDb();
const app = createApp();

app.listen(port, () => {
  console.log(`Job board API listening on http://localhost:${port}`);
});
