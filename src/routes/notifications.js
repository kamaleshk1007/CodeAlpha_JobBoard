const express = require('express');
const { markNotificationRead } = require('../models/notification');
const { notFound } = require('../utils/errors');
const { parseIdParam } = require('../utils/validate');

const router = express.Router();

router.patch('/:id/read', (req, res) => {
  const id = parseIdParam(req.params.id);
  const notification = markNotificationRead(id);
  if (!notification) {
    throw notFound(`Notification ${id} not found`);
  }
  res.json(notification);
});

module.exports = router;
