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
