const express = require('express');
const { createEmployer, getEmployerById, listEmployers } = require('../models/employer');
const { listNotificationsByEmployer } = require('../models/notification');
const { requireEmployer } = require('../middleware/entities');
const { notFound } = require('../utils/errors');
const { requireString, requireEmail, optionalString, optionalUrl, parseIdParam } = require('../utils/validate');

const router = express.Router();

router.post('/', (req, res) => {
  const employer = createEmployer({
    companyName: requireString(req.body, 'companyName'),
    email: requireEmail(req.body, 'email'),
    industry: optionalString(req.body, 'industry'),
    location: optionalString(req.body, 'location'),
    website: optionalUrl(req.body, 'website'),
  });
  res.status(201).json(employer);
});

router.get('/', (req, res) => {
  res.json(listEmployers());
});

router.get('/:id', (req, res) => {
  const id = parseIdParam(req.params.id);
  const employer = getEmployerById(id);
  if (!employer) {
    throw notFound(`Employer ${id} not found`);
  }
  res.json(employer);
});

router.get('/:id/notifications', (req, res) => {
  const employer = requireEmployer(parseIdParam(req.params.id));
  res.json(listNotificationsByEmployer(employer.id));
});

module.exports = router;
