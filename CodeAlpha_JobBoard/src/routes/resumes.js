const express = require('express');
const { getResumeById } = require('../models/resume');
const { notFound } = require('../utils/errors');
const { parseIdParam } = require('../utils/validate');

const router = express.Router();

router.get('/:id', (req, res) => {
  const id = parseIdParam(req.params.id);
  const resume = getResumeById(id);
  if (!resume) {
    throw notFound(`Resume ${id} not found`);
  }
  res.json(resume);
});

module.exports = router;
