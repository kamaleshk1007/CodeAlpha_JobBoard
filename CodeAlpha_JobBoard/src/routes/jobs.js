const express = require('express');
const { createJob, getJobById, searchJobs } = require('../models/job');
const { listApplicationsByJob } = require('../models/application');
const { getEmployerById } = require('../models/employer');
const { requireJob } = require('../middleware/entities');
const { badRequest, notFound } = require('../utils/errors');
const {
  requireString,
  requireId,
  optionalString,
  optionalInteger,
  optionalEnum,
  parseIdParam,
} = require('../utils/validate');

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const JOB_STATUSES = ['open', 'closed'];

const router = express.Router();

router.post('/', (req, res) => {
  const employerId = requireId(req.body, 'employerId');
  const title = requireString(req.body, 'title');
  const description = requireString(req.body, 'description');
  const location = optionalString(req.body, 'location');
  const employmentType = optionalEnum(req.body, 'employmentType', EMPLOYMENT_TYPES, 'full-time');
  const currency = optionalString(req.body, 'currency') || 'USD';
  const status = optionalEnum(req.body, 'status', JOB_STATUSES, 'open');
  const salaryMin = optionalInteger(req.body, 'salaryMin', { min: 0 });
  const salaryMax = optionalInteger(req.body, 'salaryMax', { min: 0 });

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw badRequest('"salaryMin" must not be greater than "salaryMax"');
  }
  if (!getEmployerById(employerId)) {
    throw notFound(`Employer ${employerId} not found`);
  }

  const job = createJob({
    employerId,
    title,
    description,
    location,
    employmentType,
    salaryMin,
    salaryMax,
    currency,
    status,
  });
  res.status(201).json(job);
});

router.get('/', (req, res) => {
  const keyword = optionalString(req.query, 'keyword');
  const location = optionalString(req.query, 'location');
  const employmentType = optionalEnum(req.query, 'employmentType', EMPLOYMENT_TYPES);
  const salaryMin = optionalInteger(req.query, 'salaryMin', { min: 0 });
  const salaryMax = optionalInteger(req.query, 'salaryMax', { min: 0 });

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw badRequest('"salaryMin" must not be greater than "salaryMax"');
  }

  res.json(searchJobs({ keyword, location, employmentType, salaryMin, salaryMax }));
});

router.get('/:id', (req, res) => {
  const id = parseIdParam(req.params.id);
  const job = getJobById(id);
  if (!job) {
    throw notFound(`Job ${id} not found`);
  }
  res.json(job);
});

router.get('/:id/applications', (req, res) => {
  const job = requireJob(parseIdParam(req.params.id));
  res.json(listApplicationsByJob(job.id));
});

module.exports = router;
