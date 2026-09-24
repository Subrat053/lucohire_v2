import React, { useState, useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { PRACTICE_QUESTION_BANK } from '../../data/practiceData';
import PracticeQuizCard from './PracticeQuizCard';
import PracticeResultsCard from './PracticeResultsCard';

export default function PracticeStep() {
  const { goToStep, selectedPaths, updatePracticeResults, practiceState } = useResumeJourney();

  const [mode, setMode] = useState('mixed');
  const [viewState, setViewState] = useState('intro'); // 'intro' | 'quiz' | 'results'
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(practiceState?.streak || 0);
  const [answersHistory, setAnswersHistory] = useState([]);
  const [flaggedIndices, setFlaggedIndices] = useState(new Set());

  // Extract questions matching selected career path(s)
  const availableQuestions = useMemo(() => {
    let pool = [];
    selectedPaths.forEach((pathId) => {
      const pack = PRACTICE_QUESTION_BANK[pathId];
      if (pack?.questions) {
        pool = [...pool, ...pack.questions];
      }
    });
    if (pool.length === 0) {
      pool = PRACTICE_QUESTION_BANK.p1?.questions || [];
    }
    return pool;
  }, [selectedPaths]);

  // Filter pool by difficulty mode
  const quizQuestions = useMemo(() => {
    if (mode === 'easy') {
      const filtered = availableQuestions.filter((q) => q.difficulty === 'easy');
      return filtered.length > 0 ? filtered.slice(0, 5) : availableQuestions.slice(0, 5);
    }
    if (mode === 'hard') {
      const filtered = availableQuestions.filter((q) => q.difficulty === 'hard');
      return filtered.length > 0 ? filtered.slice(0, 5) : availableQuestions.slice(0, 5);
    }
    return availableQuestions.slice(0, 5);
  }, [availableQuestions, mode]);

  const handleStartPractice = () => {
    setCurrentQIndex(0);
    setAnswersHistory([]);
    setFlaggedIndices(new Set());
    setViewState('quiz');
  };

  const handleAnswerQuestion = (selectedIdx, isCorrect) => {
    const q = quizQuestions[currentQIndex];
    if (isCorrect) {
      setCurrentStreak((prev) => prev + 1);
    } else {
      setCurrentStreak(0);
    }

    setAnswersHistory((prev) => [
      ...prev,
      {
        question: q,
        pickedIndex: selectedIdx,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < quizQuestions.length) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Calculate results
      const total = quizQuestions.length;
      const score = answersHistory.filter((a) => a.isCorrect).length;
      const weak = answersHistory
        .filter((a) => !a.isCorrect)
        .map((a) => a.question.topic);
      const uniqueWeak = [...new Set(weak)];

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
  const weakTopics = [...new Set(answersHistory.filter((a) => !a.isCorrect).map((a) => a.question.topic))];

  return (
    <div className="space-y-6">
      {/* Intro View (Balanced 2-column card on Desktop) */}
      {viewState === 'intro' && (
        <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#ECEAF9] pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
                Step 3 of 5 · Practice Karao
              </span>
              <h2 className="text-[19px] sm:text-[23px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                Hands-On Technical Reps
              </h2>
              <p className="text-[12.5px] text-[#767B8A] mt-0.5 m-0">
                Low-stakes interactive scenario questions before the official timed assessment. Instant explanations included.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#B9791A] bg-[#FBF1DF] px-3 py-1.5 rounded-xl shrink-0">
              <span>🔥</span>
              <span>{currentStreak} Question Streak</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Mode Selection */}
            <div className="lg:col-span-7 space-y-3">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#767B8A]">
                Choose Practice Difficulty
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'mixed', label: 'Mixed Mode', desc: 'Real Interview Blend' },
                  { id: 'easy', label: 'Core Basics', desc: 'Syntax & APIs' },
                  { id: 'hard', label: 'Edge Cases', desc: 'Architecture & Bugs' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === m.id
                        ? 'bg-[#F0EDFC] border-[#5B21D6] text-[#5B21D6] font-bold shadow-xs ring-1 ring-[#5B21D6]/30'
                        : 'border-[#ECEAF9] bg-white text-[#181B24] hover:border-[#D8D2FA]'
                    }`}
                  >
                    <div className="text-[13.5px]">{m.label}</div>
                    <div className="text-[11px] text-[#767B8A] mt-1 font-normal">{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-[#FAF9FE] rounded-xl border border-[#ECEAF9] text-[12px] text-[#767B8A] leading-relaxed">
                💡 <strong>Targeted Path Questions:</strong> All questions are selected specifically from your chosen career tracks (e.g. Next.js, TypeScript, and Server Actions).
              </div>
            </div>

            {/* Right: Session Breakdown & Start */}
            <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-5 space-y-4">
              <div className="text-[13px] font-bold text-[#141A33]">
                Practice Session Breakdown
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#141A33]">{quizQuestions.length}</div>
                  <div className="text-[10.5px] text-[#767B8A]">Questions</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#141A33]">~{Math.round(quizQuestions.length * 1.5)}m</div>
                  <div className="text-[10.5px] text-[#767B8A]">Time</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#ECEAF9]">
                  <div className="text-[17px] font-bold text-[#0E8F5F]">Instant</div>
                  <div className="text-[10.5px] text-[#767B8A]">Feedback</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartPractice}
                className="w-full py-3 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13.5px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Start Practice Round</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz View: 2-Column Split on Desktop */}
      {viewState === 'quiz' && quizQuestions[currentQIndex] && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Card (Left 8 cols) */}
          <div className="lg:col-span-8">
            <PracticeQuizCard
              question={quizQuestions[currentQIndex]}
              currentIndex={currentQIndex}
              totalQuestions={quizQuestions.length}
              streak={currentStreak}
              onAnswer={handleAnswerQuestion}
              onNext={handleNextQuestion}
              isFlagged={flaggedIndices.has(currentQIndex)}
              onToggleFlag={handleToggleFlag}
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
                  {currentQIndex + 1}/{quizQuestions.length}
                </span>
              </div>

              <div className="w-full bg-[#ECEAF9] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5B21D6] transition-all duration-300"
                  style={{ width: `${Math.round(((currentQIndex + 1) / quizQuestions.length) * 100)}%` }}
                />
              </div>

              {/* Question dots indicator */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {quizQuestions.map((_, i) => (
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
                <div className="text-[13px] font-bold text-[#141A33]">{quizQuestions[currentQIndex]?.topic}</div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#767B8A]">Current Streak:</span>
                <span className="font-bold text-[#B9791A]">🔥 {currentStreak} in a row</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {viewState === 'results' && (
        <PracticeResultsCard
          score={totalScore}
          total={quizQuestions.length}
          weakTopics={weakTopics}
          answersHistory={answersHistory}
          onPracticeAgain={() => setViewState('intro')}
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
