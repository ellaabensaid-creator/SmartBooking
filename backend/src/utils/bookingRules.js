const { addMinutesToTime, timeToMinutes } = require('./time');

function isAppointmentWithinAvailability(appointmentTime, appointmentEndTime, availability) {
  return timeToMinutes(appointmentTime) >= timeToMinutes(availability.start_time) && timeToMinutes(appointmentEndTime) <= timeToMinutes(availability.end_time);
}

function hasAppointmentOverlap(appointments, appointmentTime, appointmentEndTime) {
  return appointments.some((appointment) => {
    return timeToMinutes(appointmentTime) < timeToMinutes(appointment.end) && timeToMinutes(appointmentEndTime) > timeToMinutes(appointment.start);
  });
}

function generateAvailableSlots({ serviceId, adminId, serviceName, serviceDurationMinutes, availabilities, busyRanges }) {
  const slots = [];

  for (const availability of availabilities) {
    const slotStep = Math.max(Number(availability.slot_duration_minutes), 1);
    let current = availability.start_time;

    while (true) {
      const slotEnd = addMinutesToTime(current, serviceDurationMinutes);

      if (timeToMinutes(slotEnd) > timeToMinutes(availability.end_time)) {
        break;
      }

      if (!hasAppointmentOverlap(busyRanges, current, slotEnd)) {
        slots.push({
          serviceId,
          adminId,
          serviceName,
          time: current,
          endTime: slotEnd
        });
      }

      const nextCurrent = addMinutesToTime(current, slotStep);
      if (nextCurrent === current) {
        break;
      }

      current = nextCurrent;

      if (timeToMinutes(current) >= timeToMinutes(availability.end_time)) {
        break;
      }
    }
  }

  return slots;
}

module.exports = {
  generateAvailableSlots,
  hasAppointmentOverlap,
  isAppointmentWithinAvailability
};