const { transaction } = require('../db');
const { createApplication, updateApplicationStatus } = require('../models/application');
const { getJobById } = require('../models/job');
const { createNotification } = require('../models/notification');

function applyForJob({ jobId, candidateId, resumeId = null, coverLetter = null }) {
  return transaction(() => {
    const application = createApplication({ jobId, candidateId, resumeId, coverLetter });
    const job = getJobById(jobId);
    createNotification({
      employerId: job.employerId,
      applicationId: application.id,
      message: `New application #${application.id} from candidate #${candidateId} for "${job.title}".`,
    });
    return application;
  });
}

function changeApplicationStatus(applicationId, status) {
  return transaction(() => {
    const application = updateApplicationStatus(applicationId, status);
    if (!application) return null;
    const job = getJobById(application.jobId);
    createNotification({
      employerId: job.employerId,
      applicationId: application.id,
      message: `Application #${application.id} for "${job.title}" was updated to "${status}".`,
    });
    return application;
  });
}

module.exports = { applyForJob, changeApplicationStatus };
