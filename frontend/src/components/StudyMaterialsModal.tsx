import React, { useState } from 'react';
import { 
  X, 
  Video, 
  BookOpen, 
  Code2, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { StudyMaterial } from '../data/studyMaterials';

interface StudyMaterialsModalProps {
  material: StudyMaterial;
  isOpen: boolean;
  onClose: () => void;
}

export const StudyMaterialsModal: React.FC<StudyMaterialsModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'concepts' | 'code' | 'pitfalls' | 'quiz'>('video');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const getYouTubeWatchUrl = (embedUrl: string): string => {
    const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const videoId = match[1];
      const timeMatch = embedUrl.match(/start=(\d+)/);
      const timeParam = timeMatch ? `&t=${timeMatch[1]}s` : '';
      return `https://www.youtube.com/watch?v=${videoId}${timeParam}`;
    }
    return embedUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-6 max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-surface-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800 uppercase tracking-wider">
                {material.language} • Level {material.levelNumber}
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>Concept Study Materials</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {material.levelTitle}
            </h2>
            <p className="text-xs text-slate-600 dark:text-surface-300 max-w-2xl leading-relaxed">
              {material.overview}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-surface-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-surface-800 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Video Tutorial</span>
          </button>

          <button
            onClick={() => setActiveTab('concepts')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'concepts'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Key Concepts & Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Code Examples ({material.codeExamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pitfalls')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'pitfalls'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Common Pitfalls</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Self-Check Quiz ({material.quickQuiz.length})</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">

          {/* TAB 1: VIDEO LESSON */}
          {activeTab === 'video' && (
            <div className="space-y-5">
              {/* Video Player Box */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-surface-700 shadow-lg">
                <iframe
                  src={material.video.embedUrl}
                  title={material.video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              {/* Direct Watch Link / Fallback Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-300/40 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5 text-slate-800 dark:text-amber-200 font-medium">
                  <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span>Having trouble viewing the embedded video or prefer full-screen?</span>
                </div>
                <a
                  href={getYouTubeWatchUrl(material.video.embedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex-shrink-0 cursor-pointer shadow-sm shadow-red-600/20"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Video Meta Information */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{material.video.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-surface-400">
                    {material.video.summary}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 text-xs">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-surface-800 text-slate-800 dark:text-surface-200 font-bold">
                    <Clock className="h-3.5 w-3.5 text-brand-600" />
                    <span>{material.video.duration}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                    {material.video.instructor}
                  </span>
                </div>
              </div>

              {/* Video Timestamps Guide */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-surface-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="h-4 w-4 text-brand-500" />
                  <span>Topic Timestamps & Chapter Navigation</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {material.video.timestamps.map((ts, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-700 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800 dark:text-surface-200 font-medium">{ts.label}</span>
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800">
                        {ts.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEY CONCEPTS & REVISION NOTES */}
          {activeTab === 'concepts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {material.keyConcepts.map((section, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 space-y-3 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span>{section.title}</span>
                    </h3>
                    <ul className="space-y-2">
                      {section.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-surface-300 leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Official Reference Documentation Links */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-brand-950/30 border border-blue-200 dark:border-brand-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-brand-600" />
                  <span>Authoritative Documentation & Reference Guides</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {material.referenceLinks.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 hover:border-brand-500 transition group flex flex-col justify-between space-y-1 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-400 group-hover:underline">
                          {ref.title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-brand-500" />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-surface-400">
                        {ref.description}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CODE EXAMPLES */}
          {activeTab === 'code' && (
            <div className="space-y-6">
              {material.codeExamples.map((example, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-surface-700 overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-100 dark:bg-surface-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-surface-700">
                    <div className="flex items-center space-x-2">
                      <Code2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{example.title}</span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(example.code, idx)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 text-[11px] font-semibold text-slate-700 dark:text-surface-300 hover:text-brand-600 transition flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                    <code>{example.code}</code>
                  </pre>

                  <div className="p-3 bg-slate-50 dark:bg-surface-900/60 border-t border-slate-200 dark:border-surface-700 text-xs text-slate-700 dark:text-surface-300">
                    <strong className="text-slate-900 dark:text-white">Explanation: </strong>
                    {example.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: COMMON PITFALLS & TESTING TIPS */}
          {activeTab === 'pitfalls' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Pass All 10 Test Cases (100/100 Mark Strategy)</span>
                </p>
                <p>
                  In SkillForge assessments, every single test case carries 10 marks. A single off-by-one bug or unhandled boundary value will result in less than 100/100 and block unlocking the next level.
                </p>
              </div>

              <div className="space-y-3">
                {material.commonPitfalls.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-surface-950 border border-slate-200 dark:border-surface-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-start space-x-2">
                      <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Common Mistake:</span>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">{item.problem}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 pl-6 pt-1 border-t border-slate-100 dark:border-surface-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">How to Fix & Prevent:</span>
                        <p className="text-xs text-slate-700 dark:text-surface-300 mt-0.5">{item.solution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SELF-CHECK QUIZ */}
          {activeTab === 'quiz' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pre-Assessment Readiness Self-Check</span>
                </p>
                <p className="mt-0.5">
                  Select your answers below to verify your conceptual readiness before booking and launching the timed 60-minute test.
                </p>
              </div>

              <div className="space-y-5">
                {material.quickQuiz.map((q, qIdx) => {
                  const selectedOpt = selectedAnswers[qIdx];
                  const isCorrect = selectedOpt === q.answerIndex;

                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl bg-white dark:bg-surface-950 border border-slate-200 dark:border-surface-800 shadow-sm space-y-3"
                    >
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                        Q{qIdx + 1}: {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isThisSelected = selectedOpt === optIdx;
                          let btnStyle = 'bg-slate-50 dark:bg-surface-800 border-slate-200 dark:border-surface-700 text-slate-800 dark:text-surface-200 hover:border-brand-500';

                          if (submittedQuiz) {
                            if (optIdx === q.answerIndex) {
                              btnStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold';
                            } else if (isThisSelected && !isCorrect) {
                              btnStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-300';
                            }
                          } else if (isThisSelected) {
                            btnStyle = 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-700 dark:text-brand-300 font-bold ring-1 ring-brand-500';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectAnswer(qIdx, optIdx)}
                              className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {submittedQuiz && optIdx === q.answerIndex && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              )}
                              {submittedQuiz && isThisSelected && !isCorrect && (
                                <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {submittedQuiz && (
                        <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                          isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        }`}>
                          <strong>{isCorrect ? 'Correct! ' : 'Incorrect. '}</strong>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 dark:text-surface-400">
                    {Object.keys(selectedAnswers).length} of {material.quickQuiz.length} questions answered
                  </span>

                  <button
                    onClick={() => setSubmittedQuiz(!submittedQuiz)}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>{submittedQuiz ? 'Reset Quiz' : 'Check My Answers'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-surface-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-surface-400">
            Study materials tailored for <strong>{material.language} Level {material.levelNumber}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-800 dark:text-surface-200 font-bold transition cursor-pointer"
          >
            Close Study Guide
          </button>
        </div>

      </div>
    </div>
  );
};
