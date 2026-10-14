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
  ChevronRight, 
  RefreshCw, 
  Award
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

  // Action states
  const [runningSample, setRunningSample] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingLevel, setSubmittingLevel] = useState(false);
  const [sampleOutput, setSampleOutput] = useState<any | null>(null);
  const [levelResultModal, setLevelResultModal] = useState<any | null>(null);

  // Time remaining (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);

  useEffect(() => {
    // Fetch attempt details
    const init = async () => {
      setLoading(true);
      try {
        // Query courses to find attempt
        const coursesRes = await api.get('/courses');
        const firstCourse = coursesRes.data.courses[0];
        
        // Start/resume assessment attempt
        const startRes = await api.post('/assessments/start', {
          courseId: firstCourse.id,
          levelId: (await api.get(`/courses/${firstCourse.id}`)).data.course.levels[0].id,
        });

        if (startRes.data.success) {
          setAttempt(startRes.data.attempt);
          setQuestions(startRes.data.questions);

          // Calculate remaining seconds
          const diffMs = new Date(startRes.data.attempt.expiresAt).getTime() - Date.now();
          setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));

          // Initialize question code buffers
          const initialSubs: Record<string, QuestionSubmissionState> = {};
          startRes.data.questions.forEach((q: SanitizedQuestion) => {
            const existingSub = startRes.data.attempt.questionSubmissions?.find(
              (s: any) => s.questionId === q._id
            );
            initialSubs[q._id] = {
              code: existingSub?.code || '// Write your solution here\n',
              language: existingSub?.language || startRes.data.attempt.language || 'c',
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

    init();
  }, [attemptId]);

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining <= 0) return;
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
  }, [secondsRemaining]);

  const currentQuestion = questions[activeQuestionIndex];
  const currentSub = currentQuestion ? submissions[currentQuestion._id] : null;

  const handleCodeChange = (value: string | undefined) => {
    if (!currentQuestion) return;
    setSubmissions((prev) => ({
      ...prev,
      [currentQuestion._id]: {
        ...prev[currentQuestion._id],
        code: value || '',
      },
    }));
  };

  const handleRunSample = async () => {
    if (!attempt || !currentQuestion || !currentSub) return;
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

  const handleSubmitQuestion = async () => {
    if (!attempt || !currentQuestion || !currentSub) return;
    setSubmittingQuestion(true);
    try {
      const response = await api.post(`/assessments/${attempt.id}/submit-question`, {
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

  const handleSubmitLevel = async () => {
    if (!attempt) return;
    if (!window.confirm('Are you ready to submit your final level assessment? Your score will be calculated.')) {
      return;
    }

    setSubmittingLevel(true);
    try {
      const response = await api.post(`/assessments/${attempt.id}/submit-level`);
      if (response.data.success) {
        setLevelResultModal(response.data.result);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to finalize level assessment');
    } finally {
      setSubmittingLevel(false);
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-surface-950 text-surface-100 overflow-hidden">
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

        {/* Right Timer & Submit All */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono bg-surface-950 px-3 py-1.5 rounded-lg border border-surface-800">
            <Clock className={`h-4 w-4 ${secondsRemaining < 300 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={secondsRemaining < 300 ? 'text-rose-400 font-bold' : 'text-white'}>
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <button
            onClick={handleSubmitLevel}
            disabled={submittingLevel}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            {submittingLevel ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Level</span>
              </>
            )}
          </button>
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
              <div className="space-y-1">
                <span className="text-[11px] text-surface-400">Sample Input:</span>
                <pre className="p-2.5 rounded-lg bg-surface-950 border border-surface-800 text-white overflow-x-auto">
                  {currentQuestion.sampleTestCase.input}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-surface-400">Expected Output:</span>
                <pre className="p-2.5 rounded-lg bg-surface-950 border border-surface-800 text-emerald-400 overflow-x-auto">
                  {currentQuestion.sampleTestCase.expectedOutput}
                </pre>
              </div>
            </div>
            {currentQuestion.sampleTestCase.explanation && (
              <p className="text-[11px] text-surface-400 italic">
                {currentQuestion.sampleTestCase.explanation}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Monaco Code Editor & Test Runner (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-surface-950">
          {/* Editor Header Bar */}
          <div className="h-10 border-b border-surface-800 bg-surface-900/80 px-4 flex items-center justify-between text-xs text-surface-400 flex-shrink-0">
            <span className="font-mono text-brand-400 font-semibold uppercase">
              {currentSub?.language} Editor
            </span>
            <span>Marks: {currentSub?.questionScore || 0} / 50</span>
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
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                tabSize: 4,
              }}
            />
          </div>

          {/* Bottom Execution & Evaluation Panel */}
          <div className="border-t border-surface-800 bg-surface-900 p-4 space-y-3 flex-shrink-0 max-h-64 overflow-y-auto">
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRunSample}
                  disabled={runningSample || submittingQuestion}
                  className="py-1.5 px-3 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {runningSample ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-brand-400" />
                  )}
                  <span>Run Sample Test</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitQuestion}
                  disabled={runningSample || submittingQuestion}
                  className="py-1.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submittingQuestion ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Award className="h-3.5 w-3.5" />
                  )}
                  <span>Submit Question (5 Test Cases)</span>
                </button>
              </div>

              {activeQuestionIndex < questions.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1"
                >
                  <span>Next Question</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sample Execution Feedback */}
            {sampleOutput && (
              <div className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                sampleOutput.passed
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-sans font-semibold">
                  <span>Sample Validation: {sampleOutput.passed ? 'PASSED ✓' : 'FAILED ✗'}</span>
                  <span className="text-[11px] opacity-80">{sampleOutput.statusDescription}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-[11px]">
                  <div>Expected: <span className="text-white">{sampleOutput.expectedOutput}</span></div>
                  <div>Actual Output: <span className="text-white">{sampleOutput.actualOutput || '(none)'}</span></div>
                </div>
                {sampleOutput.stderr && (
                  <div className="text-rose-300 text-[10px] pt-1">Error: {sampleOutput.stderr}</div>
                )}
              </div>
            )}

            {/* Official 5 Main Test Cases Evaluation Results */}
            {currentSub?.testResults && currentSub.testResults.length > 0 && (
              <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Official Evaluation Results</span>
                  <span className="font-bold text-brand-400 font-mono">
                    Score: {currentSub.questionScore} / 50 marks
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {currentSub.testResults.map((tc) => (
                    <div
                      key={tc.testCaseIndex}
                      className={`p-2 rounded-lg border text-center text-[10px] space-y-0.5 ${
                        tc.passed
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      }`}
                    >
                      <div className="font-bold">Case {tc.testCaseIndex}</div>
                      <div>{tc.passed ? '+10 pts' : '0 pts'}</div>
                      <div className="text-[9px] opacity-80 truncate">{tc.statusDescription}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level Completion Result Modal */}
      {levelResultModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-surface-900 border border-surface-800 p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
              levelResultModal.passed
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                : 'bg-rose-950 border border-rose-700 text-rose-400'
            }`}>
              {levelResultModal.passed ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {levelResultModal.passed ? 'Level Cleared!' : 'Level Not Cleared'}
              </h2>
              <p className="text-xs text-surface-400">
                {levelResultModal.passed
                  ? `Congratulations! You scored ${levelResultModal.totalScore}/100 and unlocked Level ${levelResultModal.nextLevelNumber}!`
                  : `You scored ${levelResultModal.totalScore}/100. A perfect score of 100/100 is required to unlock the next level.`}
              </p>
            </div>

            {/* Score Breakdown Box */}
            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-800">
                <span className="text-surface-400">Total Official Score</span>
                <span className="font-bold text-white font-mono">{levelResultModal.totalScore} / 100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-800">
                <span className="text-surface-400">Passing Threshold</span>
                <span className="font-semibold text-emerald-400">100 / 100</span>
              </div>
              {levelResultModal.questionBreakdown?.map((qb: any) => (
                <div key={qb.questionNumber} className="flex justify-between py-1">
                  <span className="text-surface-400">Question {qb.questionNumber}</span>
                  <span className="font-mono text-white">{qb.score} / 50 pts ({qb.passedTests}/5 cases)</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => navigate('/my-results')}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition"
              >
                View Assessment Results
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold border border-surface-700 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
