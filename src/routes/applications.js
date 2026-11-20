const express = require('express');
const { getApplicationById } = require('../models/application');
const { requireCandidate, requireJob, requireResume } = require('../middleware/entities');
const { applyForJob, changeApplicationStatus } = require('../services/applications');
const { badRequest, notFound } = require('../utils/errors');
const {
  requireId,
  optionalString,
  optionalInteger,
  requireEnum,
  parseIdParam,
} = require('../utils/validate');

const APPLICATION_STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'];

const router = express.Router();

router.post('/', (req, res) => {
  const jobId = requireId(req.body, 'jobId');
  const candidateId = requireId(req.body, 'candidateId');
  const resumeId = optionalInteger(req.body, 'resumeId', { min: 1 });
  const coverLetter = optionalString(req.body, 'coverLetter');

  requireJob(jobId);
  requireCandidate(candidateId);
  if (resumeId !== null) {
    const resume = requireResume(resumeId);
    if (resume.candidateId !== candidateId) {
      throw badRequest('"resumeId" does not belong to the given candidate');
    }
  }

  const application = applyForJob({ jobId, candidateId, resumeId, coverLetter });
  res.status(201).json(application);
});

router.get('/:id', (req, res) => {
  const id = parseIdParam(req.params.id);
  const application = getApplicationById(id);
  if (!application) {
    throw notFound(`Application ${id} not found`);
  }
  res.json(application);
});

router.patch('/:id/status', (req, res) => {
  const id = parseIdParam(req.params.id);
  const status = requireEnum(req.body, 'status', APPLICATION_STATUSES);
  const application = changeApplicationStatus(id, status);
  if (!application) {
    throw notFound(`Application ${id} not found`);
  }
  res.json(application);
});

module.exports = router;
