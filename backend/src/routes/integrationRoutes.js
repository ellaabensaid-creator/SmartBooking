const express = require('express');
const { authenticate } = require('../middlewares/auth');
const {
  getAppointmentCalendarController,
  getAppointmentIntegrationController
} = require('../controllers/integrationController');

const router = express.Router();

router.get('/appointments/:id', authenticate, getAppointmentIntegrationController);
router.get('/appointments/:id/calendar.ics', authenticate, getAppointmentCalendarController);

module.exports = router;