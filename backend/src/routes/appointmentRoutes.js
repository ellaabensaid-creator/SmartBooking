const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const {
  acceptAppointmentController,
  adminAppointmentsDayController,
  adminAppointmentsExportController,
  adminAppointmentsMonthController,
  adminClientsController,
  adminStatisticsController,
  cancelAppointmentController,
  createAppointmentController,
  listMyAppointmentsExportController,
  refuseAppointmentController,
  listMyAppointmentsController
} = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', authenticate, requireRole('client'), createAppointmentController);
router.get('/my', authenticate, requireRole('client'), listMyAppointmentsController);
router.get('/my/export', authenticate, requireRole('client'), listMyAppointmentsExportController);
router.patch('/:id/cancel', authenticate, requireRole('client'), cancelAppointmentController);

router.get('/admin/day', authenticate, requireRole('admin'), adminAppointmentsDayController);
router.get('/admin/month', authenticate, requireRole('admin'), adminAppointmentsMonthController);
router.get('/admin/export', authenticate, requireRole('admin'), adminAppointmentsExportController);
router.patch('/admin/:id/accept', authenticate, requireRole('admin'), acceptAppointmentController);
router.patch('/admin/:id/refuse', authenticate, requireRole('admin'), refuseAppointmentController);
router.get('/admin/statistics', authenticate, requireRole('admin'), adminStatisticsController);
router.get('/admin/clients', authenticate, requireRole('admin'), adminClientsController);

module.exports = router;
