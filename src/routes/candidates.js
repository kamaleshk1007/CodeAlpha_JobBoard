const express = require('express');
const { createCandidate, listCandidates } = require('../models/candidate');
const { createResume, listResumesByCandidate } = require('../models/resume');
const { listApplicationsByCandidate } = require('../models/application');
const { uploadResume } = require('../middleware/upload');
const { requireCandidate } = require('../middleware/entities');
const { badRequest } = require('../utils/errors');
const { requireString, requireEmail, optionalString, parseIdParam } = require('../utils/validate');

const router = express.Router();

router.post('/', (req, res) => {
  const candidate = createCandidate({
    fullName: requireString(req.body, 'fullName'),
    email: requireEmail(req.body, 'email'),
    phone: optionalString(req.body, 'phone'),
    headline: optionalString(req.body, 'headline'),
    location: optionalString(req.body, 'location'),
  });
  res.status(201).json(candidate);
});

router.get('/', (req, res) => {
  res.json(listCandidates());
});

router.get('/:id', (req, res) => {
  res.json(requireCandidate(parseIdParam(req.params.id)));
});

router.post(
  '/:id/resumes',
  (req, res, next) => {
    req.candidate = requireCandidate(parseIdParam(req.params.id));
    next();
  },
  uploadResume.single('resume'),
  (req, res) => {
    if (!req.file) {
      throw badRequest('Resume file is required in the "resume" field');
    }
    const resume = createResume({
      candidateId: req.candidate.id,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    res.status(201).json(resume);
  }
);

router.get('/:id/resumes', (req, res) => {
  const candidate = requireCandidate(parseIdParam(req.params.id));
  res.json(listResumesByCandidate(candidate.id));
});

router.get('/:id/applications', (req, res) => {
  const candidate = requireCandidate(parseIdParam(req.params.id));
  res.json(listApplicationsByCandidate(candidate.id));
});

module.exports = router;
