const { asyncHandler } = require('../utils/asyncHandler');
const { rowsToCsv } = require('../utils/csv');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { getUserById } = require('../services/authService');
const {
  cancelAppointment,
  createAppointment,
  getAdminStatistics,
  listAdminAppointmentsForDay,
  listAdminAppointmentsForMonth,
  listAdminClients,
  listClientAppointments,
  setAppointmentStatus
} = require('../services/appointmentService');

const createAppointmentController = asyncHandler(async (req, res) => {
  const appointment = await createAppointment(req.user.id, req.body);
  const [client, admin] = await Promise.all([
    getUserById(req.user.id),
    getUserById(appointment.adminId)
  ]);

  await Promise.all([
    createNotification({
      userId: admin.id,
      type: 'appointment.created',
      title: 'Nouveau rendez-vous',
      message: `${client.firstName} ${client.lastName} a demandé un rendez-vous le ${appointment.appointmentDate} à ${appointment.appointmentTime.slice(0, 5)}.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: admin.email,
      phone: admin.phone
    }),
    createNotification({
      userId: client.id,
      type: 'appointment.created',
      title: 'Rendez-vous enregistré',
      message: `Ta demande de rendez-vous pour ${appointment.serviceName} a bien été enregistrée.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: client.email,
      phone: client.phone
    }),
    logAudit({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'appointment.create',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Rendez-vous créé pour ${appointment.serviceName}`,
      metadata: appointment
    })
  ]);

  res.status(201).json({ appointment, message: 'Rendez-vous créé avec succès.' });
});

const listMyAppointmentsController = asyncHandler(async (req, res) => {
  const result = await listClientAppointments(req.user.id, req.query);
  res.json(result);
});

const cancelAppointmentController = asyncHandler(async (req, res) => {
  const appointment = await cancelAppointment(req.user.id, Number(req.params.id));
  const [client, admin] = await Promise.all([
    getUserById(req.user.id),
    getUserById(appointment.adminId)
  ]);

  await Promise.all([
    createNotification({
      userId: admin.id,
      type: 'appointment.cancelled',
      title: 'Rendez-vous annulé',
      message: `${client.firstName} ${client.lastName} a annulé le rendez-vous ${appointment.serviceName}.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: admin.email,
      phone: admin.phone
    }),
    createNotification({
      userId: client.id,
      type: 'appointment.cancelled',
      title: 'Rendez-vous annulé',
      message: `Ton rendez-vous ${appointment.serviceName} a été annulé.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: client.email,
      phone: client.phone
    }),
    logAudit({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'appointment.cancel',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Rendez-vous annulé pour ${appointment.serviceName}`,
      metadata: appointment
    })
  ]);

  res.json({ appointment, message: 'Rendez-vous annulé.' });
});

const adminAppointmentsDayController = asyncHandler(async (req, res) => {
  const result = await listAdminAppointmentsForDay(req.user.id, String(req.query.date), req.query);
  res.json(result);
});

const adminAppointmentsMonthController = asyncHandler(async (req, res) => {
  const result = await listAdminAppointmentsForMonth(req.user.id, String(req.query.month), req.query);
  res.json(result);
});

const acceptAppointmentController = asyncHandler(async (req, res) => {
  const appointment = await setAppointmentStatus(req.user.id, Number(req.params.id), 'accepted');
  const client = await getUserById(appointment.clientId);

  await Promise.all([
    createNotification({
      userId: client.id,
      type: 'appointment.accepted',
      title: 'Rendez-vous accepté',
      message: `Ton rendez-vous ${appointment.serviceName} a été accepté.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: client.email,
      phone: client.phone
    }),
    logAudit({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'appointment.accept',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Rendez-vous accepté pour ${appointment.serviceName}`,
      metadata: appointment
    })
  ]);

  res.json({ appointment, message: 'Rendez-vous accepté.' });
});

const refuseAppointmentController = asyncHandler(async (req, res) => {
  const appointment = await setAppointmentStatus(req.user.id, Number(req.params.id), 'refused');
  const client = await getUserById(appointment.clientId);

  await Promise.all([
    createNotification({
      userId: client.id,
      type: 'appointment.refused',
      title: 'Rendez-vous refusé',
      message: `Ton rendez-vous ${appointment.serviceName} a été refusé.`,
      relatedType: 'appointment',
      relatedId: appointment.id,
      email: client.email,
      phone: client.phone
    }),
    logAudit({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'appointment.refuse',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Rendez-vous refusé pour ${appointment.serviceName}`,
      metadata: appointment
    })
  ]);

  res.json({ appointment, message: 'Rendez-vous refusé.' });
});

const adminStatisticsController = asyncHandler(async (req, res) => {
  const stats = await getAdminStatistics(req.user.id);
  res.json({ stats });
});

const adminClientsController = asyncHandler(async (req, res) => {
  const result = await listAdminClients(req.user.id, req.query);
  res.json(result);
});

const listMyAppointmentsExportController = asyncHandler(async (req, res) => {
  const result = await listClientAppointments(req.user.id, { ...req.query, page: 1, pageSize: 1000, maxPageSize: 1000 });
  const csv = rowsToCsv(result.appointments, [
    { label: 'Date', value: (row) => row.appointmentDate },
    { label: 'Heure', value: (row) => row.appointmentTime.slice(0, 5) },
    { label: 'Fin', value: (row) => row.appointmentEndTime.slice(0, 5) },
    { label: 'Service', value: (row) => row.serviceName },
    { label: 'Administrateur', value: (row) => row.adminName },
    { label: 'Statut', value: (row) => row.status },
    { label: 'Note client', value: (row) => row.clientNote || '' },
    { label: 'Note admin', value: (row) => row.adminNote || '' }
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mes-rendez-vous.csv"');
  res.send(csv);
});

const adminAppointmentsExportController = asyncHandler(async (req, res) => {
  const result = await listAdminAppointmentsForMonth(req.user.id, String(req.query.month || new Date().toISOString().slice(0, 7)), { ...req.query, page: 1, pageSize: 1000, maxPageSize: 1000 });
  const csv = rowsToCsv(result.appointments, [
    { label: 'Date', value: (row) => row.appointmentDate },
    { label: 'Heure', value: (row) => row.appointmentTime.slice(0, 5) },
    { label: 'Client', value: (row) => row.clientName },
    { label: 'Email', value: (row) => row.clientEmail },
    { label: 'Service', value: (row) => row.serviceName },
    { label: 'Statut', value: (row) => row.status },
    { label: 'Note client', value: (row) => row.clientNote || '' },
    { label: 'Note admin', value: (row) => row.adminNote || '' }
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="planning-admin.csv"');
  res.send(csv);
});

module.exports = {
  acceptAppointmentController,
  adminAppointmentsDayController,
  adminAppointmentsMonthController,
  adminAppointmentsExportController,
  adminClientsController,
  adminStatisticsController,
  cancelAppointmentController,
  createAppointmentController,
  refuseAppointmentController,
  listMyAppointmentsController,
  listMyAppointmentsExportController
};
