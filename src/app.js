const express = require('express');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const employersRouter = require('./routes/employers');
const jobsRouter = require('./routes/jobs');
const candidatesRouter = require('./routes/candidates');
const resumesRouter = require('./routes/resumes');
const applicationsRouter = require('./routes/applications');
const notificationsRouter = require('./routes/notifications');

function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/employers', employersRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/candidates', candidatesRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
