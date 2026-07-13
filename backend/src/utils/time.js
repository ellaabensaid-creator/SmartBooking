function pad(value) {
  return String(value).padStart(2, '0');
}

function toTimeString(dateOrParts) {
  if (typeof dateOrParts === 'string') {
    const parts = dateOrParts.split(':');
    return `${pad(parts[0])}:${pad(parts[1])}:${pad(parts[2] || '00')}`;
  }

  if (dateOrParts instanceof Date) {
    return `${pad(dateOrParts.getHours())}:${pad(dateOrParts.getMinutes())}:${pad(dateOrParts.getSeconds())}`;
  }

  const { hours = 0, minutes = 0, seconds = 0 } = dateOrParts || {};
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function addMinutesToTime(time, minutesToAdd) {
  const [hours, minutes, seconds = '00'] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = totalMinutes % 60;
  return `${pad(nextHours)}:${pad(nextMinutes)}:${pad(seconds)}`;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isSameOrAfter(a, b) {
  return timeToMinutes(a) >= timeToMinutes(b);
}

function isBefore(a, b) {
  return timeToMinutes(a) < timeToMinutes(b);
}

module.exports = {
  addMinutesToTime,
  isBefore,
  isSameOrAfter,
  timeToMinutes,
  toTimeString
};
