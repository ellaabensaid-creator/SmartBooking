const test = require('node:test');
const assert = require('node:assert/strict');

const { generateAvailableSlots, hasAppointmentOverlap, isAppointmentWithinAvailability } = require('../src/utils/bookingRules');

test('appointment fits inside availability window', () => {
  const availability = { start_time: '09:00:00', end_time: '12:00:00' };

  assert.equal(isAppointmentWithinAvailability('10:00:00', '10:30:00', availability), true);
  assert.equal(isAppointmentWithinAvailability('08:30:00', '09:30:00', availability), false);
});

test('appointment overlap detection works', () => {
  const busyRanges = [{ start: '09:30:00', end: '10:00:00' }];

  assert.equal(hasAppointmentOverlap(busyRanges, '09:00:00', '09:30:00'), false);
  assert.equal(hasAppointmentOverlap(busyRanges, '09:15:00', '09:45:00'), true);
});

test('slot generation skips busy ranges', () => {
  const slots = generateAvailableSlots({
    serviceId: 7,
    adminId: 3,
    serviceName: 'Consultation',
    serviceDurationMinutes: 30,
    availabilities: [
      { start_time: '09:00:00', end_time: '10:30:00', slot_duration_minutes: 30 }
    ],
    busyRanges: [{ start: '09:30:00', end: '10:00:00' }]
  });

  assert.deepEqual(
    slots.map((slot) => slot.time),
    ['09:00:00', '10:00:00']
  );
});