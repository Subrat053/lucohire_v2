import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { resumeJourneyAPI } from '../../../../../services/resumeJourneyAPI';
import { PRACTICE_QUESTION_BANK } from '../../data/practiceData';
import PracticeQuizCard from './PracticeQuizCard';
import PracticeResultsCard from './PracticeResultsCard';

export default function PracticeStep() {
  const { goToStep, selectedPaths, updatePracticeResults, practiceState } = useResumeJourney();

  const [mode, setMode] = useState(practiceState?.mode || 'mixed');
  const [viewState, setViewState] = useState('intro'); // 'intro' | 'quiz' | 'results'
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(practiceState?.streak || 0);
  const [roundStreak, setRoundStreak] = useState(0);
  const [answersHistory, setAnswersHistory] = useState([]);
  const [flaggedIndices, setFlaggedIndices] = useState(new Set());

  // Dynamic Multi-Stack Questions & Tech Profile
  const [dynamicQuestions, setDynamicQuestions] = useState([]);
  const [techStackLabel, setTechStackLabel] = useState('');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const activePathSlug = selectedPaths?.[0] || 'p1';

  // Fetch adaptive questions from backend practice engine
  const fetchQuestions = useCallback(async (requestedMode = mode) => {
    setIsLoadingQuestions(true);
    setFetchError(null);
    try {
      const res = await resumeJourneyAPI.getPracticeQuestions(activePathSlug, requestedMode);
      if (res?.data?.success && res.data.data?.questions?.length > 0) {
        setDynamicQuestions(res.data.data.questions);
        if (res.data.data.techStack) {
          setTechStackLabel(res.data.data.techStack);
        }
        return res.data.data.questions;
      }
    } catch (err) {
      console.warn('[PracticeStep] Failed to fetch dynamic questions from API, using fallback:', err.message);
      setFetchError('Could not load AI practice reps. Using curated question pack.');
    } finally {
      setIsLoadingQuestions(false);
    }

    // Fallback to local pack if API fails
    const fallbackPack = PRACTICE_QUESTION_BANK[activePathSlug]?.questions || PRACTICE_QUESTION_BANK.p1?.questions || [];
    let filtered = fallbackPack;
    if (requestedMode === 'easy') {
      filtered = fallbackPack.filter((q) => q.difficulty === 'easy');
    } else if (requestedMode === 'hard') {
      filtered = fallbackPack.filter((q) => q.difficulty === 'hard');
    }
    const finalFallback = filtered.length >= 3 ? filtered.slice(0, 5) : fallbackPack.slice(0, 5);
    setDynamicQuestions(finalFallback);
    return finalFallback;
  }, [activePathSlug, mode]);

  // Initial fetch on mount or path change
  useEffect(() => {
    fetchQuestions(mode);
  }, [fetchQuestions]);

  const activeQuestions = dynamicQuestions.length > 0 ? dynamicQuestions : [];

  const handleModeChange = (newMode) => {
    setMode(newMode);
    fetchQuestions(newMode);
  };

  const handleStartPractice = async () => {
    setCurrentQIndex(0);
    setAnswersHistory([]);
    setRoundStreak(0);
    setFlaggedIndices(new Set());

    // If no questions loaded yet, fetch now
    if (activeQuestions.length === 0) {
      await fetchQuestions(mode);
    }
    setViewState('quiz');
  };

  const handleAnswerQuestion = (selectedIdx, isCorrect) => {
    const q = activeQuestions[currentQIndex];
    if (isCorrect) {
      setCurrentStreak((prev) => prev + 1);
      setRoundStreak((prev) => prev + 1);
    } else {
      setCurrentStreak(0);
    }

    setAnswersHistory((prev) => [
      ...prev,
      {
        question: q,
        pickedIndex: selectedIdx,
        isCorrect,
        topic: q.topic || 'General',
        questionId: q.id,
      },
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentQIndex + 1 < activeQuestions.length) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Calculate results and persist submission
      const total = activeQuestions.length;
      const score = answersHistory.filter((a) => a.isCorrect).length;
      const weak = answersHistory
        .filter((a) => !a.isCorrect)
        .map((a) => a.question.topic || a.topic)
        .filter(Boolean);
      const uniqueWeak = [...new Set(weak)];

      setIsSubmitting(true);
      try {
        await resumeJourneyAPI.submitPractice({
          pathSlug: activePathSlug,
          modeKey: mode,
          answers: answersHistory.map((item) => ({
            questionId: item.question?.id || item.questionId,
            selectedOptionIndex: item.pickedIndex,
            isCorrect: item.isCorrect,
            topic: item.question?.topic || item.topic,
          })),
          currentStreak,
        });
      } catch (err) {
        console.warn('[PracticeStep] Failed to persist practice submission:', err.message);
      } finally {
        setIsSubmitting(false);
      }

      updatePracticeResults({
        score,
        total,
        weakTopics: uniqueWeak,
        streak: currentStreak,
      });

      setViewState('results');
    }
  };

  const handleToggleFlag = () => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(currentQIndex)) {
        next.delete(currentQIndex);
      } else {
        next.add(currentQIndex);
      }
      return next;
    });
  };

  const totalScore = answersHistory.filter((a) => a.isCorrect).length;
  const weakTopics = [...new Set(answersHistory.filter((a) => !a.isCorrect).map((a) => a.question.topic || a.topic).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Intro View (Balanced 2-column card on Desktop) */}
      {viewState === 'intro' && (
        <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#ECEAF9] pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
                  Step 3 of 5 · Practice Karao
                </span>
                {techStackLabel && (
                  <span className="text-[11px] font-semibold text-[#0E8F5F] bg-[#E5F6EE] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>✨</span>
                    <span>Adaptive Stack: {techStackLabel}</span>
                  </span>
                )}
              </div>
              <h2 className="text-[19px] sm:text-[23px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                Resume-Adaptive Dynamic Practice Engine
              </h2>
              <p className="text-[12.5px] text-[#767B8A] mt-0.5 m-0">
                Low-stakes interactive scenario questions generated for your actual tech stack (Python, Java, Go, React, Node, DevOps). Instant explanations and recruiter trap insights included.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[12px] font-bold text-[#B9791A] bg-[#FBF1DF] px-3.5 py-2 rounded-xl shrink-0 shadow-xs border border-[#F5E6CC]">
              <span className="text-base animate-pulse">🔥</span>
              <div>
                <span className="text-[14px]">{currentStreak}</span>
                <span className="text-[11px] text-[#935D0F] ml-1 font-semibold uppercase tracking-wider">Streak</span>
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="p-3 bg-[#FBF1DF]/60 border border-[#FBF1DF] rounded-xl text-[12px] text-[#935D0F]">
              ℹ️ {fetchError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Mode Selection */}
            <div className="lg:col-span-7 space-y-3">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#767B8A]">
                Choose Practice Difficulty &amp; Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'mixed',
                    label: 'Mixed Mode',
                    desc: 'Real Interview Blend',
                    badge: 'Recommended',
                    badgeColor: 'bg-[#5B21D6] text-white',
                  },
                  {
                    id: 'easy',
                    label: 'Core Basics',
                    desc: 'Syntax, APIs & Rules',
                    badge: 'Foundational',
                    badgeColor: 'bg-[#E5F6EE] text-[#0E8F5F]',
                  },
                  {
                    id: 'hard',
                    label: 'Edge Cases',
                    desc: 'Outages, Scale & Bugs',
                    badge: 'Senior Level',
                    badgeColor: 'bg-[#FBEAE8] text-[#B3492F]',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModeChange(m.id)}
                    disabled={isLoadingQuestions}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      mode === m.id
                        ? 'bg-[#F0EDFC] border-[#5B21D6] text-[#5B21D6] font-bold shadow-xs ring-1 ring-[#5B21D6]/30'
                        : 'border-[#ECEAF9] bg-white text-[#181B24] hover:border-[#D8D2FA]'
                    } ${isLoadingQuestions ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13.5px] font-bold">{m.label}</span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#767B8A] font-normal leading-tight">{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-[#FAF9FE] rounded-xl border border-[#ECEAF9] text-[12px] text-[#767B8A] leading-relaxed space-y-1">
                <div className="font-semibold text-[#141A33] flex items-center gap-1.5">
                  <span>💡</span>
                  <span>How This Practice Works</span>
                </div>
                <div>
                  Questions dynamically calibrate against your detected resume stack (e.g. <strong>{techStackLabel || 'Full-Stack Engineering'}</strong>) and prior weak areas. Unlike the timed Step 4 assessment, practice reps provide <strong>immediate explanations</strong> and <strong>recruiter trap breakdowns</strong> so you learn as you solve.
                </div>
              </div>
            </div>

            {/* Right: Session Breakdown & Start */}
            <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-[#141A33]">
                  Session Breakdown
                </div>
                {isLoadingQuestions && (
                  <span className="text-[11px] font-semibold text-[#5B21D6] animate-pulse">
                    Refreshing reps...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#141A33]">
                    {isLoadingQuestions ? '...' : activeQuestions.length || 5}
                  </div>
                  <div className="text-[10.5px] text-[#767B8A]">Questions</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#141A33]">
                    ~{Math.round((activeQuestions.length || 5) * 1.5)}m
                  </div>
                  <div className="text-[10.5px] text-[#767B8A]">Estimated</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#0E8F5F]">Instant</div>
                  <div className="text-[10.5px] text-[#767B8A]">AI Feedback</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartPractice}
                disabled={isLoadingQuestions}
                className="w-full py-3 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13.5px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoadingQuestions ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Curating Custom Reps...</span>
                  </>
                ) : (
                  <>
                    <span>Start Practice Round</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[11px] text-[#767B8A]">
                  Zero pressure · Wrong answers explain the recruiter pitfall without penalizing your assessment score.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz View: 2-Column Split on Desktop */}
      {viewState === 'quiz' && activeQuestions[currentQIndex] && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Card (Left 8 cols) */}
          <div className="lg:col-span-8">
            <PracticeQuizCard
              question={activeQuestions[currentQIndex]}
              currentIndex={currentQIndex}
              totalQuestions={activeQuestions.length}
              streak={currentStreak}
              onAnswer={handleAnswerQuestion}
              onNext={handleNextQuestion}
              isFlagged={flaggedIndices.has(currentQIndex)}
              onToggleFlag={handleToggleFlag}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Desktop Companion Card (Right 4 cols sticky) */}
          <div className="hidden lg:block lg:col-span-4 space-y-4 lg:sticky lg:top-4">
            <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6]">
                  Session Progress
                </span>
                <span className="text-[11px] font-semibold text-[#767B8A]">
                  {currentQIndex + 1}/{activeQuestions.length}
                </span>
              </div>

              <div className="w-full bg-[#ECEAF9] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5B21D6] transition-all duration-300"
                  style={{ width: `${Math.round(((currentQIndex + 1) / activeQuestions.length) * 100)}%` }}
                />
              </div>

              {/* Question dots indicator */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {activeQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i === currentQIndex
                        ? 'bg-[#5B21D6]'
                        : i < currentQIndex
                        ? answersHistory[i]?.isCorrect
                          ? 'bg-[#0E8F5F]'
                          : 'bg-[#B3492F]'
                        : 'bg-[#ECEAF9]'
                    }`}
                  />
                ))}
              </div>

              <div className="p-3 bg-[#FAF9FE] rounded-xl border border-[#ECEAF9] space-y-1">
                <div className="text-[11px] text-[#767B8A] uppercase font-semibold">Active Topic</div>
                <div className="text-[13px] font-bold text-[#141A33]">
                  {activeQuestions[currentQIndex]?.topic || 'Technical Drill'}
                </div>
                {techStackLabel && (
                  <div className="text-[11px] text-[#0E8F5F] font-medium pt-0.5">
                    Stack: {techStackLabel}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#ECEAF9]">
                <span className="text-[#767B8A]">Real-Time Streak:</span>
                <span className="font-bold text-[#B9791A] flex items-center gap-1">
                  <span>🔥</span>
                  <span>{currentStreak} in a row</span>
                </span>
              </div>

              {flaggedIndices.size > 0 && (
                <div className="text-[11.5px] text-[#B3492F] font-medium flex items-center gap-1">
                  <span>🚩</span>
                  <span>{flaggedIndices.size} flagged for review</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {viewState === 'results' && (
        <PracticeResultsCard
          score={totalScore}
          total={activeQuestions.length}
          weakTopics={weakTopics}
          answersHistory={answersHistory}
          currentStreak={currentStreak}
          roundStreak={roundStreak}
          techStack={techStackLabel}
          onPracticeAgain={() => {
            fetchQuestions(mode);
            setViewState('intro');
          }}
          onProceedToTest={() => goToStep(4)}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => goToStep(2)}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#E6E3F7] text-[12.5px] font-semibold text-[#5B6168] hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ← Back to Step 2: Padhaao
        </button>

        <button
          type="button"
          onClick={() => goToStep(4)}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Skip to Step 4: Test Karo</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
