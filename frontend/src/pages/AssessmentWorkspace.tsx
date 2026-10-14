import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../services/api';
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
  LogOut
} from 'lucide-react';

interface SanitizedQuestion {
  _id: string;
  questionNumber: number;
  title: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: string;
  topicTags: string[];
  sampleTestCase: {
    input: string;
    expectedOutput: string;
    explanation?: string;
  };
  timeLimitMs: number;
  memoryLimitKb: number;
  marks: number;
}

interface QuestionSubmissionState {
  code: string;
  language: string;
  questionScore: number;
  samplePassed?: boolean;
  sampleOutput?: string;
  testResults?: Array<{
    testCaseIndex: number;
    passed: boolean;
    marksEarned: number;
    statusDescription: string;
  }>;
}

interface AssessmentResultBreakdown {
  attemptId: string;
  levelNumber: number;
  totalScore: number;
  maxScore: number;
  passed: boolean;
  passedTestCasesCount: number;
  failedTestCasesCount: number;
  levelCompletionStatus: 'COMPLETED' | 'RETRY_REQUIRED';
  status: string;
  nextLevelUnlocked?: boolean;
  nextLevelNumber?: number | null;
  isExitVerified?: boolean;
  questionBreakdown: Array<{
    questionNumber: number;
    score: number;
    maxScore: number;
    passedTests: number;
    totalTests: number;
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<SanitizedQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Map of questionId -> code & state
  const [submissions, setSubmissions] = useState<Record<string, QuestionSubmissionState>>({});

  // Execution states
  const [runningSample, setRunningSample] = useState(false);
  const [sampleOutput, setSampleOutput] = useState<any | null>(null);

  // Final Overall Submission states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingOverall, setSubmittingOverall] = useState(false);
  const [finalResult, setFinalResult] = useState<AssessmentResultBreakdown | null>(null);

  // OTP Exit Verification states
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [isExitVerified, setIsExitVerified] = useState(false);
  const [exitingSession, setExitingSession] = useState(false);

  // Time remaining (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);

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
        setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));

        // If already submitted / awaiting verification
        if (att.isSubmitted && res.data.result) {
          setFinalResult(res.data.result);
        }
        if (att.isExitVerified) {
          setIsExitVerified(true);
          setOtpSuccess('Exit verified! You may now exit the assessment.');
        }

        // Initialize question code buffers
        const initialSubs: Record<string, QuestionSubmissionState> = {};
        res.data.questions.forEach((q: SanitizedQuestion) => {
          const existingSub = att.questionSubmissions?.find(
            (s: any) => s.questionId === q._id || s.questionNumber === q.questionNumber
          );
          initialSubs[q._id] = {
            code: existingSub?.code || '// Write your solution here\n',
            language: existingSub?.language || att.language || 'c',
            questionScore: existingSub?.questionScore || 0,
            testResults: existingSub?.testResults || [],
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
    if (secondsRemaining <= 0 || finalResult) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, finalResult]);

  // Protected Session: Intercept tab close, reload, or navigate away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If assessment is active and exit is not verified, warn user
      if (!isExitVerified) {
        e.preventDefault();
        e.returnValue = 'You are currently taking a protected examination session. Leaving without administrator OTP exit verification is prohibited.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExitVerified]);

  const currentQuestion = questions[activeQuestionIndex];
  const currentSub = currentQuestion ? submissions[currentQuestion._id] : null;
  const isSubmitted = !!finalResult;

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

  // Run Sample Test against non-secret sample test case
  const handleRunSample = async () => {
    if (!attempt || !currentQuestion || !currentSub || isSubmitted) return;
    setRunningSample(true);
    setSampleOutput(null);
    try {
      const response = await api.post(`/assessments/${attempt.id}/run-sample`, {
        questionId: currentQuestion._id,
        code: currentSub.code,
        language: currentSub.language,
      });

      if (response.data.success) {
        setSampleOutput(response.data.sampleTest);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error running sample test');
    } finally {
      setRunningSample(false);
    }
  };

  // Execute Overall Assessment Submission (evaluates both questions against 10 official test cases)
  const handleConfirmSubmitOverall = async () => {
    if (!attempt || isSubmitted) return;
    setSubmittingOverall(true);
    setIsSubmitModalOpen(false);

    try {
      // Package current drafts for both questions
      const payloadSubmissions = questions.map((q) => {
        const sub = submissions[q._id];
        return {
          questionId: q._id,
          code: sub ? sub.code : '',
          language: sub ? sub.language : attempt.language,
        };
      });

      const response = await api.post<{
        success: boolean;
        message: string;
        result: AssessmentResultBreakdown;
      }>(`/assessments/${attempt.id}/submit-overall`, {
        submissions: payloadSubmissions,
      });

      if (response.data.success) {
        setFinalResult(response.data.result);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit overall assessment');
    } finally {
      setSubmittingOverall(false);
    }
  };

  // Verify Administrator OTP to exit assessment
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attempt || !otpInput.trim()) return;

    setVerifyingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await api.post<{ success: boolean; message: string; isExitVerified: boolean }>(
        `/assessments/${attempt.id}/verify-exit-otp`,
        { otp: otpInput.trim() }
      );

      if (res.data.success) {
        setIsExitVerified(true);
        setOtpSuccess(res.data.message || 'OTP verified successfully! You may now exit the assessment.');
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || 'Invalid or expired OTP. Please check with your administrator.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Exit Assessment after OTP verification
  const handleExitAssessment = async () => {
    if (!attempt || !isExitVerified) return;
    setExitingSession(true);

    try {
      const res = await api.post<{ success: boolean; redirectTo: string }>(
        `/assessments/${attempt.id}/exit`
      );

      if (res.data.success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error exiting assessment session');
    } finally {
      setExitingSession(false);
    }
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
        <p className="text-xs text-surface-400">{error || 'Unable to load coding questions'}</p>
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-surface-950 text-surface-100 overflow-hidden relative">
      {/* Top Assessment Header */}
      <div className="h-14 border-b border-surface-800 bg-surface-900 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800">
              {attempt?.courseName || 'Programming Exam'}
            </span>
            <span className="text-sm font-bold text-white">
              Level {attempt?.levelNumber} Assessment
            </span>
          </div>

          {/* Question Nav Pills */}
          <div className="flex items-center space-x-1.5 ml-4 pl-4 border-l border-surface-800">
            {questions.map((q, idx) => {
              const sub = submissions[q._id];
              const isSelected = activeQuestionIndex === idx;
              const hasScore = sub && sub.questionScore > 0;

              return (
                <button
                  key={q._id}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm'
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
        </div>

        {/* Right Section: Timer & Overall Submit Button */}
        <div className="flex items-center space-x-4">
          {/* Timer */}
          <div className="flex items-center space-x-2 text-xs font-mono bg-surface-950 px-3 py-1.5 rounded-lg border border-surface-800">
            <Clock className={`h-4 w-4 ${secondsRemaining < 300 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={secondsRemaining < 300 ? 'text-rose-400 font-bold' : 'text-white'}>
              {formatTime(secondsRemaining)}
            </span>
          </div>

          {/* Submission status or Submit Overall Button */}
          {isSubmitted ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Assessment Finalized</span>
            </div>
          ) : (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={submittingOverall}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {submittingOverall ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating 10 Test Cases...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Overall Assessment</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Split Body: Left Problem Description, Right Monaco Editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Problem Statement (5 cols) */}
        <div className="lg:col-span-5 border-r border-surface-800 bg-surface-900/60 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-surface-400">
              <span>Question {currentQuestion.questionNumber} of 2</span>
              <span className="font-semibold text-accent-400">{currentQuestion.difficulty}</span>
            </div>
            <h2 className="text-xl font-bold text-white">{currentQuestion.title}</h2>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Problem Statement</h3>
            <p className="text-xs sm:text-sm text-surface-200 leading-relaxed whitespace-pre-line">
              {currentQuestion.problemStatement}
            </p>
          </div>

          {/* Input / Output Format */}
          <div className="space-y-4 pt-2 border-t border-surface-800 text-xs">
            <div>
              <h4 className="font-semibold text-surface-300 mb-1">Input Format</h4>
              <p className="text-surface-400 leading-relaxed">{currentQuestion.inputFormat}</p>
            </div>
            <div>
              <h4 className="font-semibold text-surface-300 mb-1">Output Format</h4>
              <p className="text-surface-400 leading-relaxed">{currentQuestion.outputFormat}</p>
            </div>
            <div>
              <h4 className="font-semibold text-surface-300 mb-1">Constraints</h4>
              <p className="font-mono text-surface-400 bg-surface-950 p-2 rounded-lg border border-surface-800">
                {currentQuestion.constraints}
              </p>
            </div>
          </div>

          {/* Sample Test Case */}
          <div className="space-y-2 pt-2 border-t border-surface-800">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Sample Test Case</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
                <span className="text-[10px] text-surface-500 font-sans uppercase">Input:</span>
                <pre className="text-surface-200 whitespace-pre-wrap">{currentQuestion.sampleTestCase.input}</pre>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
                <span className="text-[10px] text-surface-500 font-sans uppercase">Expected Output:</span>
                <pre className="text-surface-200 whitespace-pre-wrap">{currentQuestion.sampleTestCase.expectedOutput}</pre>
              </div>
            </div>
            {currentQuestion.sampleTestCase.explanation && (
              <p className="text-[11px] text-surface-400 italic">
                {currentQuestion.sampleTestCase.explanation}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Monaco Code Editor & Testing Sandbox (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-surface-950 overflow-hidden">
          {/* Action Toolbar */}
          <div className="h-10 border-b border-surface-800 bg-surface-900/40 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-surface-400 font-mono text-[11px]">
              <span>Track:</span>
              <span className="font-bold text-white uppercase">{currentSub?.language}</span>
              {isSubmitted && (
                <span className="ml-2 px-2 py-0.5 rounded bg-surface-800 text-amber-300 text-[10px] font-semibold flex items-center space-x-1">
                  <Lock className="h-3 w-3" />
                  <span>Read-Only Mode</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunSample}
                disabled={runningSample || isSubmitted}
                className="px-3 py-1 rounded bg-surface-800 hover:bg-surface-700 text-white font-medium text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {runningSample ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 text-emerald-400" />
                )}
                <span>Run Sample Test</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              language={getMonacoLanguage(currentSub?.language || 'c')}
              theme="vs-dark"
              value={currentSub?.code || ''}
              onChange={handleCodeChange}
              options={{
                readOnly: isSubmitted || submittingOverall,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>

          {/* Console / Output Drawer */}
          <div className="h-44 border-t border-surface-800 bg-surface-900/90 flex flex-col overflow-hidden text-xs">
            <div className="h-7 border-b border-surface-800 px-4 flex items-center justify-between text-surface-400 font-semibold text-[11px]">
              <span>Sample Test Output & Execution</span>
              {sampleOutput && (
                <span className={sampleOutput.passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {sampleOutput.passed ? 'Sample Test Passed' : 'Sample Test Failed'}
                </span>
              )}
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-2">
              {sampleOutput ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-surface-950 border border-surface-800">
                      <p className="text-surface-500 font-sans text-[10px]">Your Output:</p>
                      <pre className="text-white whitespace-pre-wrap">{sampleOutput.actualOutput || '(no stdout)'}</pre>
                    </div>
                    <div className="p-2 rounded bg-surface-950 border border-surface-800">
                      <p className="text-surface-500 font-sans text-[10px]">Expected Output:</p>
                      <pre className="text-emerald-400 whitespace-pre-wrap">{sampleOutput.expectedOutput}</pre>
                    </div>
                  </div>
                  {sampleOutput.stderr && (
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-800 text-rose-300">
                      <pre className="whitespace-pre-wrap">{sampleOutput.stderr}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-surface-500 italic">Click "Run Sample Test" to verify your code against sample I/O.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Final Overall Submission */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-surface-900 border border-surface-700 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Entire Assessment?</h3>
                <p className="text-xs text-surface-400">Confirmation Required</p>
              </div>
            </div>

            <p className="text-xs text-surface-300 leading-relaxed">
              Are you sure you want to submit the entire assessment? Your answers will be evaluated and your final score will be calculated.
            </p>

            <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 text-[11px] text-surface-300 space-y-1">
              <div className="flex items-center justify-between text-surface-400">
                <span>Total Questions:</span>
                <span className="font-semibold text-white">2 Programming Problems</span>
              </div>
              <div className="flex items-center justify-between text-surface-400">
                <span>Evaluation Cases:</span>
                <span className="font-semibold text-white">10 Official Test Cases (5 each)</span>
              </div>
              <div className="flex items-center justify-between text-surface-400">
                <span>Passing Threshold:</span>
                <span className="font-semibold text-emerald-400">100 / 100 Required</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-400 hover:text-white transition"
              >
                Return to Coding
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitOverall}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Confirm & Submit Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results & Student OTP Exit Verification Panel */}
      {finalResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full rounded-3xl bg-surface-900 border border-surface-700 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
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
                {finalResult.passed ? 'Level Cleared!' : 'Level Not Cleared'}
              </h2>
              <p className="text-xs text-surface-400">
                {finalResult.passed
                  ? `Congratulations! You scored ${finalResult.totalScore}/100 and successfully cleared Level ${finalResult.levelNumber}!`
                  : `You scored ${finalResult.totalScore}/100. A perfect score of 100/100 (all 10 test cases) is required to unlock the next level.`}
              </p>
            </div>

            {/* Official Score Card */}
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
                  <span className="text-emerald-400 font-bold">{finalResult.passedTestCasesCount} Passed</span>
                  <span className="text-surface-600"> / </span>
                  <span className="text-rose-400 font-bold">{finalResult.failedTestCasesCount} Failed</span>
                </span>
              </div>

              {/* Questions Breakdown */}
              {finalResult.questionBreakdown?.map((qb) => (
                <div key={qb.questionNumber} className="flex items-center justify-between text-surface-300">
                  <span>Question {qb.questionNumber} Score:</span>
                  <span className="font-mono font-semibold text-white">
                    {qb.score} / 50 pts ({qb.passedTests}/5 cases passed)
                  </span>
                </div>
              ))}
            </div>

            {/* OTP Verification Section */}
            <div className="rounded-2xl bg-brand-950/30 border border-brand-800/80 p-5 space-y-4">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="h-5 w-5 text-brand-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Verify OTP to Exit Assessment</h3>
                  <p className="text-xs text-surface-400">
                    Enter the OTP generated by the administrator to exit this assessment.
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
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-1.5 disabled:opacity-50"
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
                    <span>Closing Assessment Session...</span>
                  </>
                ) : isExitVerified ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Exit Assessment to Dashboard</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-surface-500" />
                    <span>Exit Assessment (OTP Verification Required)</span>
                  </>
                )}
              </button>

              {!isExitVerified && (
                <p className="text-[10px] text-surface-500 text-center">
                  In accordance with examination proctoring rules, exit is authorized only upon administrator OTP verification.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
