import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Play, 
  Send, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Lock,
  KeyRound,
  LogOut,
  ShieldAlert,
  Sun,
  Moon,
  Check,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  RotateCcw,
  ListFilter
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SanitizedQuestion {
  _id: string;
  questionNumber: number;
  // Coding fields
  title?: string;
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleTestCase?: {
    input: string;
    expectedOutput: string;
    explanation?: string;
  };
  mainTestCases?: Array<{
    input: string;
    expectedOutput: string;
    marks?: number;
    explanation?: string;
  }>;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  marks?: number;
  // MCQ fields
  questionText?: string;
  options?: Array<{ key: string; text: string }>;
  topicTag?: string;
  difficulty?: string;
  correctOption?: string;
  explanation?: string;
  negativeMarks?: number;
}

interface QuestionSubmissionState {
  code?: string;
  language?: string;
  selectedOption?: string;
  questionScore?: number;
  samplePassed?: boolean;
  sampleOutput?: string;
  isCorrect?: boolean;
  isNegativeMarked?: boolean;
  correctOption?: string;
  explanation?: string;
  testResults?: Array<{
    testCaseIndex: number;
    passed: boolean;
    marksEarned: number;
    statusDescription: string;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    executionTimeMs?: number;
  }>;
}

interface AssessmentResultBreakdown {
  attemptId: string;
  levelNumber: number;
  assessmentType?: string;
  totalScore: number;
  maxScore: number;
  passingScore?: number;
  passed: boolean;
  correctCount?: number;
  wrongCount?: number;
  unattemptedCount?: number;
  negativePenalty?: number;
  passedTestCasesCount?: number;
  failedTestCasesCount?: number;
  levelCompletionStatus: 'COMPLETED' | 'RETRY_REQUIRED';
  status: string;
  nextLevelUnlocked?: boolean;
  nextLevelNumber?: number | null;
  isExitVerified?: boolean;
  questionBreakdown: Array<{
    questionNumber: number;
    questionId?: string;
    selectedOption?: string;
    correctOption?: string;
    isCorrect?: boolean;
    isNegativeMarked?: boolean;
    explanation?: string;
    score?: number;
    questionScore?: number;
    maxScore?: number;
    passedTests?: number;
    totalTests?: number;
    testResults?: Array<{
      testCaseIndex: number;
      passed: boolean;
      marksEarned: number;
      statusDescription: string;
    }>;
  }>;
}

export const AssessmentWorkspace: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toggleTheme, isLight } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<SanitizedQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Map of questionId -> code & state
  const [submissions, setSubmissions] = useState<Record<string, QuestionSubmissionState>>({});

  // Execution states (for coding)
  const [runningSample, setRunningSample] = useState(false);
  const [sampleOutput, setSampleOutput] = useState<any | null>(null);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'sample' | 'evaluation'>('sample');

  // Final Overall Submission states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingOverall, setSubmittingOverall] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<AssessmentResultBreakdown | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');

  const isSubmitted = !!finalResult;

  // OTP Exit Verification states
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [isExitVerified, setIsExitVerified] = useState(false);
  const [exitingSession, setExitingSession] = useState(false);

  // Time remaining (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);

  // Refs for tracking submissions and ensuring auto-submit only triggers once
  const submissionsRef = useRef<Record<string, QuestionSubmissionState>>({});
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  // Load exact assessment attempt by ID from URL
  const fetchAttemptData = async () => {
    if (!attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        success: boolean;
        attempt: any;
        questions: SanitizedQuestion[];
        result: AssessmentResultBreakdown | null;
      }>(`/assessments/${attemptId}`);

      if (res.data.success) {
        const att = res.data.attempt;
        setAttempt(att);
        setQuestions(res.data.questions);

        // Calculate remaining seconds
        const diffMs = new Date(att.expiresAt).getTime() - Date.now();
        const remSec = Math.max(0, Math.floor(diffMs / 1000));
        setSecondsRemaining(remSec);

        // If already submitted / awaiting verification
        if (att.isSubmitted && res.data.result) {
          setFinalResult(res.data.result);
        } else if (remSec === 0 && !hasAutoSubmittedRef.current) {
          hasAutoSubmittedRef.current = true;
          setTimeout(() => {
            handleConfirmSubmitOverall(true);
          }, 300);
        }

        if (att.isExitVerified) {
          setIsExitVerified(true);
          setOtpSuccess('Exit verified! You may now exit the assessment.');
        }

        // Initialize question code buffers / MCQ options
        const initialSubs: Record<string, QuestionSubmissionState> = {};
        res.data.questions.forEach((q: SanitizedQuestion) => {
          const existingSub = att.questionSubmissions?.find(
            (s: any) => s.questionId === q._id || s.questionNumber === q.questionNumber
          );
          initialSubs[q._id] = {
            code: existingSub?.code || '// Write your solution here\n',
            language: existingSub?.language || att.language || 'c',
            selectedOption: existingSub?.selectedOption || '',
            questionScore: existingSub?.questionScore || 0,
            testResults: existingSub?.testResults || [],
            isCorrect: existingSub?.isCorrect,
            isNegativeMarked: existingSub?.isNegativeMarked,
            correctOption: existingSub?.correctOption,
            explanation: existingSub?.explanation,
          };
        });
        setSubmissions(initialSubs);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to open workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttemptData();
  }, [attemptId]);

  // Countdown timer effect
  useEffect(() => {
    if (finalResult) return;

    if (secondsRemaining <= 0) {
      if (!hasAutoSubmittedRef.current && attempt && questions.length > 0 && !isSubmitted && !submittingOverall) {
        hasAutoSubmittedRef.current = true;
        handleConfirmSubmitOverall(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasAutoSubmittedRef.current && !isSubmitted && !submittingOverall) {
            hasAutoSubmittedRef.current = true;
            handleConfirmSubmitOverall(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, finalResult, isSubmitted, submittingOverall, attempt, questions]);

  // Safe Exam Anti-Cheating Protection: Instant Logout on Tab Switch / Minimize
  useEffect(() => {
    if (isSubmitted || isExitVerified || loading || error || !attempt) {
      return;
    }

    const triggerTabSwitchLogout = async (reason: string) => {
      const targetAttemptId = attemptId || attempt?.id || attempt?._id;
      if (targetAttemptId) {
        try {
          await api.post(`/assessments/${targetAttemptId}/security-violation`, {
            reason,
            details: 'Tab switch or window focus lost detected during active examination.',
          });
        } catch (_) {}
      }

      try {
        await logout();
      } catch (_) {}

      sessionStorage.setItem('safe_exam_violation', 'true');
      sessionStorage.setItem(
        'safe_exam_violation_reason',
        'Safe Exam Security Violation: You were automatically logged out and your examination was terminated because you switched tabs or minimized the active examination window. Copying answers from external sources is strictly prohibited.'
      );

      window.location.href = '/login?violation=tab_switch';
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerTabSwitchLogout('Tab switch or window minimization detected via document visibilitychange.');
      }
    };

    const handleWindowBlur = () => {
      triggerTabSwitchLogout('Window focus lost (candidate switched application or window).');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isSubmitted, isExitVerified, loading, error, attempt]);

  const currentQuestion = questions[activeQuestionIndex];
  const currentSub = currentQuestion ? submissions[currentQuestion._id] : null;

  const isAptitude = attempt?.assessmentType === 'aptitude' || attempt?.language === 'aptitude' || (questions[0]?.options && questions[0].options.length > 0);
  const answeredCount = questions.filter((q) => !!submissions[q._id]?.selectedOption).length;
  const unansweredCount = questions.length - answeredCount;

  // Code editor handler
  const handleCodeChange = (value: string | undefined) => {
    if (!currentQuestion || isSubmitted) return;
    setSubmissions((prev) => ({
      ...prev,
      [currentQuestion._id]: {
        ...prev[currentQuestion._id],
        code: value || '',
      },
    }));
  };

  // MCQ Option selection handler
  const handleSelectOption = async (optionKey: string) => {
    if (!currentQuestion || isSubmitted) return;
    const currentSelected = submissions[currentQuestion._id]?.selectedOption || '';
    const newSelected = currentSelected === optionKey ? '' : optionKey;

    setSubmissions((prev) => ({
      ...prev,
      [currentQuestion._id]: {
        ...prev[currentQuestion._id],
        selectedOption: newSelected,
      },
    }));

    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (targetAttemptId) {
      try {
        await api.post(`/assessments/${targetAttemptId}/answer`, {
          questionId: currentQuestion._id,
          selectedOption: newSelected,
        });
      } catch (err) {
        console.error('Failed to auto-save answer:', err);
      }
    }
  };

  // Run Sample Test against non-secret sample test case (Coding)
  const handleRunSample = async () => {
    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (!targetAttemptId || !currentQuestion || !currentSub || isSubmitted) return;
    setRunningSample(true);
    setSampleOutput(null);
    try {
      const response = await api.post(`/assessments/${targetAttemptId}/run-sample`, {
        questionId: currentQuestion._id,
        code: currentSub.code,
        language: currentSub.language,
      });

      if (response.data.success) {
        setSampleOutput(response.data.sampleTest);
        setConsoleTab('sample');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error running sample test');
    } finally {
      setRunningSample(false);
    }
  };

  // Submit single question and evaluate all 5 test cases (Coding)
  const handleSubmitQuestion = async () => {
    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (!targetAttemptId || !currentQuestion || !currentSub || isSubmitted) return;
    setSubmittingQuestion(true);
    setConsoleTab('evaluation');
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        questionScore: number;
        maxScore: number;
        testCasesPassed: number;
        totalTestCases: number;
        testResults: Array<{
          testCaseIndex: number;
          passed: boolean;
          marksEarned: number;
          statusDescription: string;
          input?: string;
          expectedOutput?: string;
          actualOutput?: string;
          executionTimeMs?: number;
        }>;
      }>(`/assessments/${targetAttemptId}/submit-question`, {
        questionId: currentQuestion._id,
        code: currentSub.code,
        language: currentSub.language,
      });

      if (response.data.success) {
        setSubmissions((prev) => ({
          ...prev,
          [currentQuestion._id]: {
            ...prev[currentQuestion._id],
            questionScore: response.data.questionScore,
            testResults: response.data.testResults,
          },
        }));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error submitting question for evaluation');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Execute Overall Assessment Submission (evaluates all questions)
  const handleConfirmSubmitOverall = async (isAuto = false) => {
    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (!targetAttemptId || isSubmitted || submittingOverall) return;
    setSubmittingOverall(true);
    if (isAuto) {
      setIsAutoSubmitting(true);
    }
    setIsSubmitModalOpen(false);

    try {
      const currentSubs = submissionsRef.current;
      const isApt = isAptitude;
      const payloadSubmissions = questions.map((q) => {
        const sub = currentSubs[q._id];
        if (isApt) {
          return {
            questionId: q._id,
            selectedOption: sub ? sub.selectedOption || '' : '',
          };
        }
        return {
          questionId: q._id,
          code: sub ? sub.code : '',
          language: sub ? sub.language : (attempt?.language || 'c'),
        };
      });

      const response = await api.post<{
        success: boolean;
        message: string;
        result: AssessmentResultBreakdown;
      }>(`/assessments/${targetAttemptId}/submit-overall`, {
        submissions: payloadSubmissions,
      });

      if (response.data.success && response.data.result) {
        setFinalResult(response.data.result);
      }
    } catch (err: any) {
      console.error('Failed to submit overall assessment:', err);
      try {
        const checkRes = await api.get<{ success: boolean; result: AssessmentResultBreakdown | null }>(
          `/assessments/${targetAttemptId}`
        );
        if (checkRes.data.result) {
          setFinalResult(checkRes.data.result);
          return;
        }
      } catch (_) {}
      alert(err?.response?.data?.message || 'Failed to submit overall assessment');
    } finally {
      setSubmittingOverall(false);
      setIsAutoSubmitting(false);
    }
  };

  // Verify Administrator OTP to exit assessment
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (!targetAttemptId) return;

    setVerifyingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await api.post<{ success: boolean; message: string; isExitVerified: boolean; redirectTo?: string }>(
        `/assessments/${targetAttemptId}/verify-exit-otp`,
        { otp: otpInput.trim() }
      );

      if (res.data.success) {
        setIsExitVerified(true);
        setOtpSuccess(res.data.message || 'Exit OTP verified successfully! Exiting assessment and logging out...');
        setTimeout(async () => {
          try {
            await logout();
          } catch (_) {}
          window.location.href = '/login';
        }, 1200);
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || 'The OTP has expired (30-second window exceeded) or is invalid. Please wait for the administrator to generate a new OTP.');
      setOtpInput('');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Exit Assessment after OTP verification
  const handleExitAssessment = async () => {
    const targetAttemptId = attemptId || attempt?.id || attempt?._id;
    if (!isExitVerified || !targetAttemptId) return;
    setExitingSession(true);

    try {
      await api.post<{ success: boolean; redirectTo: string }>(
        `/assessments/${targetAttemptId}/exit`
      );
    } catch (_) {}

    try {
      await logout();
    } catch (_) {}
    window.location.href = '/login';
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'java': return 'java';
      case 'python': return 'python';
      case 'javascript': return 'javascript';
      default: return 'c';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Preparing isolated examination sandbox...</p>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Assessment Error</h2>
        <p className="text-xs text-surface-400">{error || 'Unable to load assessment questions'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-xl bg-surface-800 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`h-[calc(100vh-4rem)] flex flex-col ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-surface-950 text-surface-100'} overflow-hidden relative transition-colors duration-200`}>
      {/* Top Assessment Header */}
      <div className={`h-14 border-b ${isLight ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-surface-800 bg-surface-900 text-white'} px-4 sm:px-6 flex items-center justify-between flex-shrink-0 transition-colors`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800">
              {attempt?.courseName || (isAptitude ? 'Quantitative & Logical Aptitude' : 'Programming Exam')}
            </span>
            <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Level {attempt?.levelNumber} {isAptitude ? 'MCQ Assessment' : 'Assessment'}
            </span>
          </div>

          {/* Non-Aptitude Coding Question Nav Pills */}
          {!isAptitude && (
            <div className={`flex items-center space-x-1.5 ml-4 pl-4 border-l ${isLight ? 'border-slate-200' : 'border-surface-800'}`}>
              {questions.map((q, idx) => {
                const sub = submissions[q._id];
                const isSelected = activeQuestionIndex === idx;
                const hasScore = sub && (sub.questionScore || 0) > 0;

                return (
                  <button
                    key={q._id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-surface-800 hover:bg-surface-700 text-surface-300'
                    }`}
                  >
                    <span>Q{q.questionNumber}</span>
                    {hasScore && (
                      <span className="text-[10px] px-1 rounded bg-black/30">
                        {sub.questionScore}/50
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Aptitude Question Status Pill in Header */}
          {isAptitude && (
            <div className="hidden md:flex items-center space-x-2 ml-4 pl-4 border-l border-surface-800 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono font-semibold">
                Answered: {answeredCount} / {questions.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 font-mono text-[11px] flex items-center space-x-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
                <span>Pass: 24/40 Marks &bull; -0.25 Wrong</span>
              </span>
            </div>
          )}
        </div>

        {/* Right Section: White BG Toggle, Safe Exam Badge, Timer & Overall Submit Button */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* White / Dark Background Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm'
                : 'bg-surface-800 hover:bg-surface-700 border-surface-700 text-amber-300'
            }`}
            title={isLight ? 'Switch to Dark Mode Background' : 'Switch to White Background'}
            aria-label="Toggle White/Dark Background"
          >
            {isLight ? (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline text-[11px]">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">White BG</span>
              </>
            )}
          </button>

          {/* Safe Exam Proctoring Badge */}
          <div 
            title="Safe Exam Browser Active: Switching tabs or minimizing this window will instantly terminate your exam and log you out."
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-[11px] text-rose-300 font-semibold shadow-inner"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400 animate-pulse flex-shrink-0" />
            <span>Safe Exam Active:</span>
            <span className="text-rose-400 font-mono text-[10px]">Tab Switching Locked</span>
          </div>

          {/* Timer */}
          <div className={`flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
            secondsRemaining < 300 
              ? 'bg-rose-950/60 text-rose-300 border-rose-800 animate-pulse' 
              : isLight
              ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold'
              : 'bg-surface-950 text-surface-200 border-surface-800'
          }`}>
            <Clock className="h-3.5 w-3.5 text-surface-400" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Submit Overall Assessment Button */}
          {!isSubmitted && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={submittingOverall}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
            >
              {submittingOverall ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{isAptitude ? 'Submit Exam' : 'Submit Overall Assessment'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {isAptitude ? (
        /* APTITUDE MCQ WORKSPACE */
        <div className="flex-1 flex overflow-hidden">
          {/* Left: 40 Question Palette Sidebar */}
          <div className={`w-72 sm:w-80 border-r flex flex-col flex-shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-white' : 'border-surface-800 bg-surface-900/80'
          }`}>
            <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-surface-800 bg-surface-950/60'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-surface-300'}`}>
                  Question Palette
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800">
                  {answeredCount} / {questions.length} Answered
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center space-x-1.5 text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center space-x-1.5 text-surface-400">
                  <span className="h-2 w-2 rounded-full bg-surface-600" />
                  <span>Unanswered ({unansweredCount})</span>
                </div>
              </div>
            </div>

            {/* Grid of 40 question buttons */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const sub = submissions[q._id];
                  const isAnswered = !!sub?.selectedOption;
                  const isCurrent = activeQuestionIndex === idx;

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`h-11 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-950 z-10'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border border-surface-700/60'
                      }`}
                    >
                      <span>Q{q.questionNumber}</span>
                      {isAnswered && (
                        <span className="text-[9px] font-mono font-bold leading-none opacity-90">
                          [{sub.selectedOption}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Marking Scheme Summary Card */}
            <div className={`p-4 border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-surface-800 bg-surface-950'} space-y-2 text-[11px]`}>
              <div className="font-semibold text-xs flex items-center justify-between">
                <span className={isLight ? 'text-slate-800' : 'text-white'}>Marking Scheme</span>
                <span className="text-purple-400 font-bold">Pass: 24 / 40</span>
              </div>
              <div className="space-y-1 text-surface-400">
                <div className="flex justify-between">
                  <span>Correct Answer:</span>
                  <span className="text-emerald-400 font-semibold font-mono">+1.0 mark</span>
                </div>
                <div className="flex justify-between">
                  <span>Wrong Answer:</span>
                  <span className="text-rose-400 font-semibold font-mono">-0.25 mark</span>
                </div>
                <div className="flex justify-between">
                  <span>Unattempted:</span>
                  <span className="text-surface-400 font-semibold font-mono">0 marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Active Question & Interactive Options Card */}
          <div className={`flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col justify-between transition-colors ${
            isLight ? 'bg-slate-50 text-slate-900' : 'bg-surface-950 text-surface-100'
          }`}>
            <div className="max-w-3xl w-full mx-auto space-y-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-800">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-lg bg-brand-950 text-brand-300 border border-brand-800 text-xs font-bold">
                    Question {currentQuestion.questionNumber} of {questions.length}
                  </span>
                  {currentQuestion.topicTag && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800 text-[11px] font-semibold">
                      {currentQuestion.topicTag}
                    </span>
                  )}
                  {currentQuestion.difficulty && (
                    <span className="px-2 py-1 rounded-lg bg-surface-800 text-surface-300 text-[11px] font-medium">
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 font-mono font-bold">
                    +1.0 Mark
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/80 font-mono font-bold">
                    -0.25 Negative
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-2">
                <p className={`text-base sm:text-lg font-medium leading-relaxed ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {currentQuestion.questionText || currentQuestion.problemStatement}
                </p>
              </div>

              {/* 4 Selectable Options */}
              <div className="space-y-3 pt-2">
                <p className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-surface-400'}`}>
                  Select Your Answer:
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {(currentQuestion.options || []).map((opt) => {
                    const isSelected = submissions[currentQuestion._id]?.selectedOption === opt.key;

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectOption(opt.key)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                          isSelected
                            ? 'bg-brand-600/15 border-brand-500 shadow-md shadow-brand-500/20 text-white ring-1 ring-brand-500'
                            : isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                            : 'bg-surface-900 hover:bg-surface-800/80 border-surface-800 text-surface-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`h-8 w-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-sm'
                              : isLight
                              ? 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                              : 'bg-surface-800 text-surface-300 group-hover:bg-surface-700'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="text-sm font-medium leading-snug">
                            {opt.text}
                          </span>
                        </div>

                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : isLight
                            ? 'border-slate-300'
                            : 'border-surface-700'
                        }`}>
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Nav Bar */}
            <div className="max-w-3xl w-full mx-auto pt-8 border-t border-surface-800 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={activeQuestionIndex === 0}
                onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-xl border border-surface-700 hover:bg-surface-800 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Question</span>
              </button>

              {submissions[currentQuestion._id]?.selectedOption && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(submissions[currentQuestion._id]?.selectedOption || '')}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-surface-400 hover:text-rose-400 hover:bg-rose-950/30 transition flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear Selection</span>
                </button>
              )}

              {activeQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-600/30 transition cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Review & Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CODING SPLIT BODY: Monaco Editor */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Problem Statement (5 cols) with Anti-Copy Lock */}
          <div 
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => {
              e.preventDefault();
              alert('Safe Exam Alert: Copying problem statements and assessment materials to external sources is strictly prohibited.');
            }}
            className={`lg:col-span-5 border-r overflow-y-auto p-6 space-y-6 select-none transition-colors duration-200 ${
              isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-surface-800 bg-surface-900/60 text-surface-200'
            }`}
          >
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-slate-500' : 'text-surface-400'}`}>
                <span>Question {currentQuestion.questionNumber} of 2</span>
                <span className="font-semibold text-accent-500">{currentQuestion.difficulty}</span>
              </div>
              <h2 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentQuestion.title}</h2>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-surface-400'}`}>Problem Statement</h3>
              <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isLight ? 'text-slate-700' : 'text-surface-200'}`}>
                {currentQuestion.problemStatement}
              </p>
            </div>

            {/* Input / Output Format */}
            <div className={`space-y-4 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-surface-800'} text-xs`}>
              <div>
                <h4 className={`font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-surface-300'}`}>Input Format</h4>
                <p className={`leading-relaxed ${isLight ? 'text-slate-600' : 'text-surface-400'}`}>{currentQuestion.inputFormat}</p>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-surface-300'}`}>Output Format</h4>
                <p className={`leading-relaxed ${isLight ? 'text-slate-600' : 'text-surface-400'}`}>{currentQuestion.outputFormat}</p>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-surface-300'}`}>Constraints</h4>
                <p className={`font-mono p-2 rounded-lg border ${
                  isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-surface-950 text-surface-400 border-surface-800'
                }`}>
                  {currentQuestion.constraints}
                </p>
              </div>
            </div>

            {/* Sample Test Case */}
            {currentQuestion.sampleTestCase && (
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-surface-800'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-surface-400'}`}>Sample Test Case</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className={`p-2.5 rounded-lg border space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-950 border-surface-800'
                  }`}>
                    <span className={`text-[10px] font-sans uppercase ${isLight ? 'text-slate-500' : 'text-surface-500'}`}>Input:</span>
                    <pre className={`whitespace-pre-wrap ${isLight ? 'text-slate-900' : 'text-surface-200'}`}>{currentQuestion.sampleTestCase.input}</pre>
                  </div>
                  <div className={`p-2.5 rounded-lg border space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-950 border-surface-800'
                  }`}>
                    <span className={`text-[10px] font-sans uppercase ${isLight ? 'text-slate-500' : 'text-surface-500'}`}>Expected Output:</span>
                    <pre className={`whitespace-pre-wrap ${isLight ? 'text-emerald-700 font-bold' : 'text-surface-200'}`}>{currentQuestion.sampleTestCase.expectedOutput}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Code Editor & Execution Console (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-surface-950">
            {/* Editor Area */}
            <div className="flex-1 relative overflow-hidden">
              <Editor
                height="100%"
                language={getMonacoLanguage(currentSub?.language || attempt?.language || 'c')}
                value={currentSub?.code || ''}
                onChange={handleCodeChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                }}
              />
            </div>

            {/* Bottom Execution Bar & Console */}
            <div className={`h-60 border-t ${isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-surface-800 bg-surface-900 text-surface-200'} flex flex-col flex-shrink-0 transition-colors`}>
              {/* Controls bar */}
              <div className={`h-11 px-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-surface-800 bg-surface-950'} flex items-center justify-between`}>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => setConsoleTab('sample')}
                    className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                      consoleTab === 'sample' 
                        ? 'bg-brand-600 text-white' 
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Sample Output
                  </button>
                  <button
                    onClick={() => setConsoleTab('evaluation')}
                    className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                      consoleTab === 'evaluation' 
                        ? 'bg-brand-600 text-white' 
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Official Evaluation (5 Tests)
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRunSample}
                    disabled={runningSample || isSubmitted}
                    className="px-3 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {runningSample ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 text-cyan-400" />
                    )}
                    <span>Run Sample</span>
                  </button>

                  <button
                    onClick={handleSubmitQuestion}
                    disabled={submittingQuestion || isSubmitted}
                    className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingQuestion ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 text-white" />
                    )}
                    <span>Submit & Evaluate Q{currentQuestion.questionNumber}</span>
                  </button>
                </div>
              </div>

              {/* Console Output Area */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
                {consoleTab === 'sample' ? (
                  sampleOutput ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {sampleOutput.passed ? (
                          <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Sample Test Passed</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center space-x-1 font-bold">
                            <XCircle className="h-4 w-4" />
                            <span>Sample Test Failed</span>
                          </span>
                        )}
                        <span className="text-surface-500">({sampleOutput.executionTimeMs}ms)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-surface-500">Actual Output:</span>
                          <pre className="p-2 rounded bg-surface-950 border border-surface-800 text-white mt-1 whitespace-pre-wrap">{sampleOutput.actualOutput || '(No stdout output)'}</pre>
                        </div>
                        <div>
                          <span className="text-surface-500">Expected Output:</span>
                          <pre className="p-2 rounded bg-surface-950 border border-surface-800 text-emerald-400 mt-1 whitespace-pre-wrap">{sampleOutput.expectedOutput}</pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-surface-500 text-xs">
                      Click "Run Sample" to test against public test cases.
                    </div>
                  )
                ) : (
                  currentSub?.testResults && currentSub.testResults.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-sans font-bold text-white text-xs">
                          Score Earned: {currentSub.questionScore} / 50 pts
                        </span>
                        <span className="text-surface-400 text-[11px]">
                          ({currentSub.testResults.filter((t) => t.passed).length} of 5 test cases passed)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {currentSub.testResults.map((t) => (
                          <div
                            key={t.testCaseIndex}
                            className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                              t.passed
                                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                                : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              {t.passed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                              )}
                              <span>Official Test Case #{t.testCaseIndex}</span>
                            </span>
                            <span className="font-bold">{t.marksEarned} / 10 marks ({t.statusDescription})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-surface-500 text-xs">
                      Click "Submit & Evaluate Q{currentQuestion.questionNumber}" to evaluate your solution against all 5 official evaluation test cases.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Overall Submission */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-surface-900 border border-surface-700 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Send className="h-5 w-5 text-emerald-400" />
              <span>Confirm Overall Exam Submission</span>
            </h3>

            {isAptitude ? (
              <div className="space-y-3 text-xs text-surface-300">
                <p>
                  You are about to finalize and submit your <strong>Quantitative & Logical Aptitude Level {attempt?.levelNumber}</strong> assessment.
                </p>
                <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
                  <div className="flex justify-between font-mono">
                    <span>Questions Answered:</span>
                    <strong className="text-emerald-400">{answeredCount} of {questions.length}</strong>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Unanswered Questions:</span>
                    <strong className="text-surface-400">{unansweredCount} of {questions.length}</strong>
                  </div>
                  <div className="flex justify-between font-mono border-t border-surface-800 pt-1 text-purple-300">
                    <span>Passing Score Required:</span>
                    <strong>24 / 40 Marks</strong>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Negative Marking Reminder:</strong> Each incorrect answer incurs a penalty of <strong>-0.25 marks</strong>. Unanswered questions incur 0 penalty.
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-surface-300">
                <p>
                  You are submitting your solutions for both Question 1 and Question 2.
                </p>
                <p className="text-surface-400">
                  Your code will be evaluated against all 10 official test cases. A perfect score of <strong>100/100</strong> is required to pass Level {attempt?.levelNumber} and unlock the next level.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-surface-800">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-surface-700 text-xs text-surface-300 hover:bg-surface-800 transition cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSubmitOverall(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Submitting Countdown Expiry Overlay */}
      {isAutoSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-950/80 border border-amber-600/80 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-950/50">
            <Clock className="h-9 w-9 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">Time Expired!</h2>
            <p className="text-xs sm:text-sm text-surface-300 max-w-md">
              Assessment examination time has ended. Your responses are being automatically submitted and evaluated.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-amber-400 font-mono pt-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Evaluating answers and preparing exit verification...</span>
          </div>
        </div>
      )}

      {/* Results & Student OTP Exit Verification Panel */}
      {finalResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full rounded-3xl bg-surface-900 border border-surface-700 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Header / Outcome Icon */}
            <div className="text-center space-y-2">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
                finalResult.passed
                  ? 'bg-emerald-950 border border-emerald-700 text-emerald-400 shadow-emerald-950/50'
                  : 'bg-rose-950 border border-rose-700 text-rose-400 shadow-rose-950/50'
              }`}>
                {finalResult.passed ? <CheckCircle2 className="h-9 w-9" /> : <XCircle className="h-9 w-9" />}
              </div>

              <h2 className="text-2xl font-extrabold text-white">
                {finalResult.passed ? 'Level Cleared! Congratulations!' : 'Level Not Cleared'}
              </h2>
              <p className="text-xs text-surface-400 max-w-lg mx-auto">
                {finalResult.assessmentType === 'aptitude'
                  ? finalResult.passed
                    ? `You scored ${finalResult.totalScore}/40 and met the passing threshold of 24/40 marks! Level ${finalResult.levelNumber} is officially cleared.`
                    : `You scored ${finalResult.totalScore}/40. A score of at least 24/40 is required to clear Level ${finalResult.levelNumber}.`
                  : finalResult.passed
                    ? `Congratulations! You scored ${finalResult.totalScore}/100 and successfully cleared Level ${finalResult.levelNumber}!`
                    : `You scored ${finalResult.totalScore}/100. A perfect score of 100/100 is required to clear Level ${finalResult.levelNumber}.`}
              </p>
            </div>

            {/* Official Score Card */}
            {finalResult.assessmentType === 'aptitude' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-surface-950 border border-surface-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-surface-400">Total Score</span>
                    <p className="text-lg font-extrabold text-white font-mono">{finalResult.totalScore} / 40</p>
                    <span className="text-[10px] text-purple-400 font-semibold">Pass: 24/40</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-950 border border-emerald-900/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Correct (+1.0)</span>
                    <p className="text-lg font-extrabold text-emerald-400 font-mono">+{finalResult.correctCount || 0}</p>
                    <span className="text-[10px] text-surface-400 font-mono">+{(finalResult.correctCount || 0) * 1.0} pts</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-950 border border-rose-900/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400">Wrong (-0.25)</span>
                    <p className="text-lg font-extrabold text-rose-400 font-mono">-{finalResult.wrongCount || 0}</p>
                    <span className="text-[10px] text-surface-400 font-mono">-{(finalResult.negativePenalty || 0).toFixed(2)} pts</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-950 border border-surface-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-surface-400">Unattempted</span>
                    <p className="text-lg font-extrabold text-surface-400 font-mono">{finalResult.unattemptedCount || 0}</p>
                    <span className="text-[10px] text-surface-500 font-mono">0.00 pts</span>
                  </div>
                </div>

                {/* Question Review Section */}
                <div className="rounded-2xl bg-surface-950 border border-surface-800 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                      <ListFilter className="h-3.5 w-3.5 text-brand-400" />
                      <span>Question Review & Explanations</span>
                    </span>
                    <div className="flex items-center space-x-1 text-[10px]">
                      {(['all', 'correct', 'wrong', 'unattempted'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setReviewFilter(filter)}
                          className={`px-2 py-0.5 rounded capitalize transition ${
                            reviewFilter === filter
                              ? 'bg-brand-600 text-white font-bold'
                              : 'text-surface-400 hover:text-white bg-surface-900'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {(finalResult.questionBreakdown || [])
                      .filter((qb) => {
                        if (reviewFilter === 'correct') return qb.isCorrect;
                        if (reviewFilter === 'wrong') return qb.isNegativeMarked;
                        if (reviewFilter === 'unattempted') return !qb.selectedOption;
                        return true;
                      })
                      .map((qb) => {
                        const questionDoc = questions.find((q) => q.questionNumber === qb.questionNumber);

                        return (
                          <div
                            key={qb.questionNumber}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                              qb.isCorrect
                                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                                : qb.isNegativeMarked
                                ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                                : 'bg-surface-900 border-surface-800 text-surface-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>Q{qb.questionNumber}: {questionDoc?.topicTag || 'Aptitude'}</span>
                              <span className="font-mono">
                                {qb.isCorrect
                                  ? '+1.0 Mark'
                                  : qb.isNegativeMarked
                                  ? '-0.25 Mark'
                                  : '0 Marks (Skipped)'}
                              </span>
                            </div>

                            <p className="text-surface-300 text-[11px] leading-relaxed">
                              {questionDoc?.questionText}
                            </p>

                            <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1">
                              <span>
                                Your Answer: <strong>{qb.selectedOption || 'None'}</strong>
                              </span>
                              <span>&bull;</span>
                              <span className="text-emerald-400 font-bold">
                                Correct Answer: Option {qb.correctOption}
                              </span>
                            </div>

                            {qb.explanation && (
                              <div className="p-2 rounded bg-black/40 border border-white/5 text-[10.5px] text-surface-300 font-sans mt-1">
                                <strong className="text-white">Explanation: </strong>
                                {qb.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              /* Coding Score Breakdown */
              <div className="rounded-2xl bg-surface-950 border border-surface-800 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                  <span className="text-surface-400">Total Official Score:</span>
                  <span className="font-extrabold text-base text-white font-mono">
                    {finalResult.totalScore} / 100
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                  <span className="text-surface-400">Official Test Cases:</span>
                  <span className="font-mono text-white">
                    <span className="text-emerald-400 font-bold">{finalResult.passedTestCasesCount || 0} Passed</span>
                    <span className="text-surface-600"> / </span>
                    <span className="text-rose-400 font-bold">{finalResult.failedTestCasesCount || 0} Failed</span>
                  </span>
                </div>

                {finalResult.questionBreakdown?.map((qb) => (
                  <div key={qb.questionNumber} className="flex items-center justify-between text-surface-300">
                    <span>Question {qb.questionNumber} Score:</span>
                    <span className="font-mono font-semibold text-white">
                      {qb.score ?? qb.questionScore ?? 0} / 50 pts ({qb.passedTests ?? 0}/5 cases passed)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* OTP Verification Section */}
            <div className="rounded-2xl bg-brand-950/30 border border-brand-800/80 p-5 space-y-4">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Verify OTP to Exit & Log Out</h3>
                  <p className="text-xs text-surface-400">
                    Enter the 6-digit OTP told by your administrator to verify exit and log out of the assessment.
                  </p>
                </div>
              </div>

              {/* Status Message */}
              {otpSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{otpSuccess}</span>
                </div>
              )}

              {otpError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* OTP Form */}
              {!isExitVerified && (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 px-4 py-2.5 bg-surface-950 border border-surface-700 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-white placeholder-surface-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp || otpInput.length !== 6}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {verifyingOtp ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Verify OTP</span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-surface-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>OTP is valid for 30 seconds from generation by the proctor.</span>
                  </p>
                </form>
              )}
            </div>

            {/* Exit Action Button (Disabled until verified) */}
            <div className="pt-2 flex flex-col items-center space-y-2">
              <button
                onClick={handleExitAssessment}
                disabled={!isExitVerified || exitingSession}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-xs transition flex items-center justify-center space-x-2 ${
                  isExitVerified
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40 cursor-pointer'
                    : 'bg-surface-800 border border-surface-700 text-surface-500 cursor-not-allowed opacity-60'
                }`}
              >
                {exitingSession ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Logging Out of Assessment Session...</span>
                  </>
                ) : isExitVerified ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Exit & Log Out to Login Screen</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-surface-500" />
                    <span>Exit & Log Out (OTP Verification Required)</span>
                  </>
                )}
              </button>

              {!isExitVerified && (
                <p className="text-[10px] text-surface-500 text-center">
                  In accordance with examination proctoring rules, exit and logout is authorized only upon administrator OTP verification.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
