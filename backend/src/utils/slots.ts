export interface ExamSlotDefinition {
  slotIndex: number;
  startTime: string; // "09:10"
  endTime: string;   // "10:10"
  label: string;     // "9:10 AM – 10:10 AM"
}

// 8 consecutive 1-hour slots starting at 9:10 AM through 5:10 PM (5:10 to 5:30 is 20 min gap, cannot fit 1hr)
export const EXAM_SLOTS: ExamSlotDefinition[] = [
  { slotIndex: 1, startTime: '09:10', endTime: '10:10', label: '9:10 AM – 10:10 AM' },
  { slotIndex: 2, startTime: '10:10', endTime: '11:10', label: '10:10 AM – 11:10 AM' },
  { slotIndex: 3, startTime: '11:10', endTime: '12:10', label: '11:10 AM – 12:10 PM' },
  { slotIndex: 4, startTime: '12:10', endTime: '13:10', label: '12:10 PM – 1:10 PM' },
  { slotIndex: 5, startTime: '13:10', endTime: '14:10', label: '1:10 PM – 2:10 PM' },
  { slotIndex: 6, startTime: '14:10', endTime: '15:10', label: '2:10 PM – 3:10 PM' },
  { slotIndex: 7, startTime: '15:10', endTime: '16:10', label: '3:10 PM – 4:10 PM' },
  { slotIndex: 8, startTime: '16:10', endTime: '17:10', label: '4:10 PM – 5:10 PM' },
];

export const generateSlotReference = (date: string, startTime: string): string => {
  const cleanDate = date.replace(/-/g, '');
  const cleanTime = startTime.replace(':', '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SF-${cleanDate}-${cleanTime}-${randomSuffix}`;
};

export interface CampusTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export const getCampusNow = (): CampusTime => {
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
  const date = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const time = `${getPart('hour')}:${getPart('minute')}`;
  return { date, time };
};

export interface SlotTimingStatus {
  isNow: boolean;
  isFuture: boolean;
  isPast: boolean;
  message: string;
}

export const checkSlotTiming = (
  date: string,
  startTime: string,
  endTime: string
): SlotTimingStatus => {
  const campus = getCampusNow();

  if (date < campus.date) {
    return {
      isNow: false,
      isFuture: false,
      isPast: true,
      message: `Exam slot on ${date} has expired.`,
    };
  }

  if (date > campus.date) {
    return {
      isNow: false,
      isFuture: true,
      isPast: false,
      message: `Exam slot scheduled for ${date} at ${startTime} (Asia/Kolkata).`,
    };
  }

  // Date is today in Asia/Kolkata
  if (campus.time < startTime) {
    return {
      isNow: false,
      isFuture: true,
      isPast: false,
      message: `Exam slot starts today at ${startTime} (Asia/Kolkata).`,
    };
  }

  if (campus.time > endTime) {
    return {
      isNow: false,
      isFuture: false,
      isPast: true,
      message: `Exam slot ended today at ${endTime} (Asia/Kolkata).`,
    };
  }

  return {
    isNow: true,
    isFuture: false,
    isPast: false,
    message: `Exam slot is active right now (${startTime} – ${endTime} Asia/Kolkata).`,
  };
};
