const { asyncHandler } = require('../utils/asyncHandler');
const { getAppointmentIntegration } = require('../services/integrationService');

const getAppointmentIntegrationController = asyncHandler(async (req, res) => {
  const integration = await getAppointmentIntegration(Number(req.params.id));
  res.json({ integration });
});

const getAppointmentCalendarController = asyncHandler(async (req, res) => {
  const integration = await getAppointmentIntegration(Number(req.params.id));
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="appointment-${req.params.id}.ics"`);
  res.send(integration.calendar.ics);
});

module.exports = {
  getAppointmentCalendarController,
  getAppointmentIntegrationController
};