export interface SlotTimingInfo {
  isNow: boolean;
  isFuture: boolean;
  isPast: boolean;
  campusDate: string;
  campusTime: string;
}

export const checkSlotStatus = (
  dateStr: string,
  startTime: string,
  endTime: string
): SlotTimingInfo => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const campusDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const campusTime = `${getPart('hour')}:${getPart('minute')}`;

  if (dateStr < campusDate) {
    return { isNow: false, isFuture: false, isPast: true, campusDate, campusTime };
  }
  if (dateStr > campusDate) {
    return { isNow: false, isFuture: true, isPast: false, campusDate, campusTime };
  }

  // Today
  if (campusTime < startTime) {
    return { isNow: false, isFuture: true, isPast: false, campusDate, campusTime };
  }
  if (campusTime > endTime) {
    return { isNow: false, isFuture: false, isPast: true, campusDate, campusTime };
  }

  return { isNow: true, isFuture: false, isPast: false, campusDate, campusTime };
};
