import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Calendar as CalendarIcon,
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Info,
  ArrowRight,
  Play
} from 'lucide-react';
import { checkSlotStatus } from '../utils/slotTiming';

interface CourseOption {
  id: string;
  name: string;
  language: string;
  currentUnlockedLevel: number;
}

interface SlotOption {
  slotIndex: number;
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'BOOKED_BY_YOU' | 'UNAVAILABLE';
  statusReason: string;
}

export const BookExam: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(searchParams.get('courseId') || '');
  const [selectedLevelNumber, setSelectedLevelNumber] = useState<number>(() => {
    const lvl = searchParams.get('level');
    return lvl ? parseInt(lvl, 10) : 1;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  });
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [launchingExam, setLaunchingExam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Sync state when query params change
  useEffect(() => {
    const cid = searchParams.get('courseId');
    if (cid) setSelectedCourseId(cid);
    const lvl = searchParams.get('level');
    if (lvl) setSelectedLevelNumber(parseInt(lvl, 10));
  }, [searchParams]);

  // Load available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get<{ success: boolean; courses: any[] }>('/courses');
        if (response.data.success) {
          setCourses(response.data.courses);
          if (!selectedCourseId && response.data.courses.length > 0) {
            setSelectedCourseId(response.data.courses[0].id);
          }
        }
      } catch (err: any) {
        setError('Failed to fetch available courses');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch slot availability when date or course changes
  const fetchAvailability = async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const response = await api.get<{ success: boolean; slots: SlotOption[] }>(
        `/bookings/availability?date=${selectedDate}`
      );
      if (response.data.success) {
        setSlots(response.data.slots);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch slot availability');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const handleConfirmBooking = async () => {
    if (!selectedCourseId || !selectedSlot || !selectedDate) return;

    setBookingInProgress(true);
    setError(null);

    try {
      // Find level ID from course details
      const courseRes = await api.get(`/courses/${selectedCourseId}`);
      const levels = courseRes.data.course.levels;
      const targetLevel = levels.find((l: any) => l.levelNumber === selectedLevelNumber);

      if (!targetLevel) {
        throw new Error('Level not found for this course');
      }

      const response = await api.post('/bookings', {
        courseId: selectedCourseId,
        levelId: targetLevel.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
      });

      if (response.data.success) {
        setSuccessBooking({
          ...response.data.booking,
          courseId: selectedCourseId,
          levelId: targetLevel.id,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to book slot');
      // Refresh slots in case of collision
      fetchAvailability();
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleEnterExamNow = async () => {
    if (!successBooking) return;
    setLaunchingExam(true);
    setError(null);
    try {
      const response = await api.post('/assessments/start', {
        courseId: successBooking.courseId || selectedCourseId,
        levelId: successBooking.levelId,
        bookingId: successBooking.id,
      });

      if (response.data.success && response.data.attempt) {
        navigate(`/workspace/${response.data.attempt.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to initialize assessment workspace');
      setLaunchingExam(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const maxUnlockedLevel = selectedCourse ? selectedCourse.currentUnlockedLevel : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Exam Slot Booking
        </h1>
        <p className="text-xs sm:text-sm text-surface-400 mt-1 max-w-3xl">
          Reserve your exclusive one-hour examination slot. Daily assessment windows operate strictly between 9:10 AM and 5:30 PM (Asia/Kolkata campus timezone).
        </p>
      </div>

      {/* Booking Window Notice Banner */}
      <div className="rounded-xl bg-brand-950/40 border border-brand-800/60 p-4 flex items-start space-x-3 text-brand-300 text-xs">
        <Info className="h-5 w-5 flex-shrink-0 text-brand-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Daily Examination Window Schedule</p>
          <p className="text-brand-300/90 leading-relaxed">
            Examination slots are generated consecutively starting at <strong>9:10 AM</strong> for exactly one hour. The final 1-hour slot ends at <strong>5:10 PM</strong>. The remaining 20 minutes from 5:10 PM to 5:30 PM serve as system maintenance buffer and cannot accommodate a full 1-hour assessment.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Booking Modal / Banner */}
      {successBooking ? (
        (() => {
          const slotTiming = checkSlotStatus(
            successBooking.date,
            successBooking.startTime,
            successBooking.endTime
          );

          return (
            <div className="rounded-2xl bg-surface-900 border border-emerald-800 p-8 text-center space-y-6 shadow-2xl">
              <div className="h-16 w-16 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Examination Slot Confirmed!</h2>
                <p className="text-xs text-surface-300 max-w-md mx-auto">
                  Your examination reservation is locked in the system. Use your reference code to attend the examination.
                </p>
              </div>

              {/* Ticket Card */}
              <div className="max-w-md mx-auto p-5 rounded-xl bg-surface-950 border border-surface-800 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-surface-800">
                  <span className="text-surface-400">Booking Reference</span>
                  <span className="font-bold text-brand-400">{successBooking.slotReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Course</span>
                  <span className="text-white">{successBooking.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Level</span>
                  <span className="text-white">Level {successBooking.levelNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Date</span>
                  <span className="text-white">{successBooking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Time Window</span>
                  <span className="text-white">{successBooking.startTime} – {successBooking.endTime} ({successBooking.campusTimezone})</span>
                </div>
              </div>

              {/* Timing Condition Indicator */}
              {slotTiming.isNow ? (
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs text-center font-medium space-y-1">
                  <div className="flex items-center justify-center space-x-1.5 text-emerald-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Your exam slot is ACTIVE RIGHT NOW!</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    You can enter the assessment workspace immediately.
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-brand-950/50 border border-brand-800 text-brand-300 text-xs text-center space-y-1">
                  <div className="flex items-center justify-center space-x-1.5 text-brand-300 font-semibold">
                    <Clock className="h-4 w-4 text-brand-400" />
                    <span>Scheduled for {successBooking.date} at {successBooking.startTime} IST</span>
                  </div>
                  <p className="text-[11px] text-brand-300/80">
                    The examination workspace will unlock automatically when your scheduled timing begins.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4">
                {slotTiming.isNow && (
                  <button
                    onClick={handleEnterExamNow}
                    disabled={launchingExam}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {launchingExam ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Launching Exam...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Enter Exam Workspace Now</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => navigate(`/courses/${selectedCourseId}`)}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition flex items-center space-x-1.5"
                >
                  <span>Back to Course Levels</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/my-assessments')}
                  className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold border border-surface-700 transition"
                >
                  Go to My Assessments
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls: Course, Level, Date */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              <span>Assessment Details</span>
            </h2>

            {/* Course select */}
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Programming Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={loadingCourses}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level select */}
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Assessment Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((lvl) => {
                  const isUnlocked = lvl <= maxUnlockedLevel;
                  const isSelected = selectedLevelNumber === lvl;

                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setSelectedLevelNumber(lvl)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/30'
                          : isUnlocked
                          ? 'bg-surface-950 text-surface-300 border-surface-800 hover:border-surface-700'
                          : 'bg-surface-950/40 text-surface-600 border-surface-800/60 cursor-not-allowed'
                      }`}
                    >
                      L{lvl}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-surface-500 mt-1.5">
                {selectedLevelNumber > maxUnlockedLevel
                  ? 'Locked: Must clear earlier level first'
                  : `Level ${selectedLevelNumber} selected (Duration: 60 mins)`}
              </p>
            </div>

            {/* Date picker */}
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Examination Date
              </label>
              <div className="relative">
                <CalendarIcon className="h-4 w-4 text-surface-500 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-surface-800 text-xs text-surface-400 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Available Slot</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span>Reserved by You</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-700" />
                <span>Unavailable / Full</span>
              </div>
            </div>
          </div>

          {/* Slot Grid (2 cols) */}
          <div className="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-accent-400" />
                    <span>Select Time Slot ({selectedDate})</span>
                  </h2>
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    Click an available slot to reserve your seat
                  </p>
                </div>
                <button
                  onClick={fetchAvailability}
                  disabled={loadingSlots}
                  className="p-1.5 rounded-lg bg-surface-800 text-surface-300 hover:text-white border border-surface-700"
                  title="Refresh Slots"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingSlots ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingSlots ? (
                <div className="py-16 text-center text-surface-400 text-xs space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
                  <p>Checking live slot availability...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.slotIndex === slot.slotIndex;

                    return (
                      <button
                        key={slot.slotIndex}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-950 border-brand-500 shadow-md ring-1 ring-brand-500'
                            : slot.isAvailable
                            ? 'bg-surface-950 border-surface-800 hover:border-surface-700 text-white'
                            : slot.status === 'BOOKED_BY_YOU'
                            ? 'bg-brand-950/40 border-brand-800 text-brand-300 opacity-80 cursor-not-allowed'
                            : 'bg-surface-950/40 border-surface-800/60 text-surface-600 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-white block">
                            {slot.label}
                          </span>
                          <span className="text-[10px] text-surface-400">
                            Slot {slot.slotIndex} • 60 Mins
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            slot.isAvailable
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : slot.status === 'BOOKED_BY_YOU'
                              ? 'bg-brand-950 text-brand-300 border border-brand-800'
                              : 'bg-surface-800 text-surface-500'
                          }`}
                        >
                          {slot.statusReason}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Booking Action */}
            <div className="pt-5 border-t border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-surface-400">
                {selectedSlot ? (
                  <span>Selected: <strong className="text-white">{selectedSlot.label}</strong> on {selectedDate}</span>
                ) : (
                  <span>Please choose an available slot above to confirm your booking.</span>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedSlot || bookingInProgress}
                onClick={handleConfirmBooking}
                className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {bookingInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Reserving Slot...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reserve Slot</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
