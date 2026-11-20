const { getEmployerById } = require('../models/employer');
const { getCandidateById } = require('../models/candidate');
const { getJobById } = require('../models/job');
const { getResumeById } = require('../models/resume');
const { notFound } = require('../utils/errors');

function requireEmployer(id) {
  const employer = getEmployerById(id);
  if (!employer) {
    throw notFound(`Employer ${id} not found`);
  }
  return employer;
}

function requireCandidate(id) {
  const candidate = getCandidateById(id);
  if (!candidate) {
    throw notFound(`Candidate ${id} not found`);
  }
  return candidate;
}

function requireJob(id) {
  const job = getJobById(id);
  if (!job) {
    throw notFound(`Job ${id} not found`);
  }
  return job;
}

function requireResume(id) {
  const resume = getResumeById(id);
  if (!resume) {
    throw notFound(`Resume ${id} not found`);
  }
  return resume;
}

module.exports = { requireEmployer, requireCandidate, requireJob, requireResume };
