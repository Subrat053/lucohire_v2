import React, { useState, useEffect, useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TEST_QUESTION_BANK, SECONDS_PER_QUESTION } from '../../data/testData';
import { resumeJourneyAPI } from '../../../../../services/resumeJourneyAPI';
import TestRunnerCard from './TestRunnerCard';
import TestSubmitModal from './TestSubmitModal';
import TestResultsCard from './TestResultsCard';

export default function TestStep() {
  const { goToStep, selectedPaths, updateTestResults, testState, refreshJourneyState } = useResumeJourney();

  const [viewState, setViewState] = useState(
    testState?.status === 'submitted' ? 'results' : 'intro'
  );
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [serverQuestions, setServerQuestions] = useState(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(null);
  const [questionReviews, setQuestionReviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  const activePathSlug = selectedPaths?.[0] || 'p1';

  // Fallback questions for offline resilience
  const fallbackQuestions = useMemo(() => {
    let pool = [];
    selectedPaths.forEach((pathId) => {
      const pack = TEST_QUESTION_BANK[pathId];
      if (pack?.questions) {
        pool = [...pool, ...pack.questions];
      }
    });
    if (pool.length === 0) {
      pool = TEST_QUESTION_BANK.p1?.questions || [];
    }
    return pool;
  }, [selectedPaths]);

  const questions = serverQuestions && serverQuestions.length > 0 ? serverQuestions : fallbackQuestions;
  const totalTimeSeconds = timeRemainingSeconds || (questions.length * (SECONDS_PER_QUESTION || 90));

  const handleStartTest = async () => {
    setIsLoadingTest(true);
    setAnswers({});
    setFlags({});
    setCurrentQIndex(0);
    setStartTime(Date.now());
    setQuestionReviews([]);

    try {
      const res = await resumeJourneyAPI.startAssessment(activePathSlug);
      if (res?.data?.success && res.data.data) {
        const d = res.data.data;
        setAttemptId(d.attemptId);
        if (d.timeRemainingSeconds) {
          setTimeRemainingSeconds(d.timeRemainingSeconds);
        }
        if (Array.isArray(d.questions) && d.questions.length > 0) {
          setServerQuestions(
            d.questions.map((q, idx) => ({
              id: q.id || q.questionId,
              orderIndex: q.orderIndex ?? idx,
              scenario: q.scenario || q.text,
              options: q.options || [],
              topic: q.topic || q.topicName || 'System Architecture',
              difficulty: q.difficulty || 'medium',
              codeSnippet: q.codeSnippet,
            }))
          );
        }

        // Restore previous session if resumed
        if (d.isResumed) {
          if (d.existingAnswers) {
            const restoredAnswers = {};
            d.questions.forEach((q, idx) => {
              const qId = q.id || q.questionId;
              if (d.existingAnswers[qId] !== undefined) {
                restoredAnswers[idx] = d.existingAnswers[qId];
              }
            });
            setAnswers(restoredAnswers);
          }
          if (d.existingFlags) {
            const restoredFlags = {};
            d.questions.forEach((q, idx) => {
              const qId = q.id || q.questionId;
              if (d.existingFlags[qId]) {
                restoredFlags[idx] = true;
              }
            });
            setFlags(restoredFlags);
          }
        }
      }
    } catch (err) {
      console.warn('[TestStep] Using local assessment question bank:', err.message);
    } finally {
      setIsLoadingTest(false);
      setViewState('running');
    }
  };

  const handlePickAnswer = (qIdx, optIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));

    // Quietly sync answer to server in background
    const q = questions[qIdx];
    if (attemptId && q?.id) {
      resumeJourneyAPI.saveAssessmentAnswer({
        attemptId,
        questionId: q.id,
        selectedOptionIndex: optIdx,
        isFlagged: Boolean(flags[qIdx]),
      }).catch(() => {});
    }
  };

  const handleToggleFlag = (qIdx) => {
    const nextFlag = !flags[qIdx];
    setFlags((prev) => ({ ...prev, [qIdx]: nextFlag }));

    const q = questions[qIdx];
    if (attemptId && q?.id) {
      resumeJourneyAPI.saveAssessmentAnswer({
        attemptId,
        questionId: q.id,
        selectedOptionIndex: answers[qIdx] ?? null,
        isFlagged: nextFlag,
      }).catch(() => {});
    }
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);

    const timeUsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 180;

    // Server-Authoritative Assessment Submission
    if (attemptId) {
      try {
        const payloadAnswers = {};
        questions.forEach((q, idx) => {
          if (q.id && answers[idx] !== undefined) {
            payloadAnswers[q.id] = answers[idx];
          }
        });

        const res = await resumeJourneyAPI.submitAssessment({
          attemptId,
          answers: payloadAnswers,
        });

        if (res?.data?.success && res.data.data) {
          const d = res.data.data;
          updateTestResults({
            score: d.score,
            total: d.total || questions.length,
            timeUsed: d.timeUsedSeconds || timeUsed,
            topicBreakdown: d.topicBreakdown || {},
            weakTopics: d.weakTopics || [],
          });

          if (Array.isArray(d.questionReviews)) {
            setQuestionReviews(d.questionReviews);
          }

          refreshJourneyState?.();
          setIsSubmitting(false);
          setViewState('results');
          return;
        }
      } catch (err) {
        console.warn('[TestStep] Server grading failed, falling back to client scoring:', err.message);
      }
    }

    // Client-side fallback scoring if offline
    let correctCount = 0;
    const topicBreakdown = {};
    const weakTopics = [];
    const localReviews = [];

    questions.forEach((q, idx) => {
      const isCorrect = answers[idx] === q.correct;
      if (isCorrect) correctCount++;

      const topic = q.topic || 'General';
      if (!topicBreakdown[topic]) {
        topicBreakdown[topic] = { correct: 0, total: 0 };
      }
      topicBreakdown[topic].total++;
      if (isCorrect) {
        topicBreakdown[topic].correct++;
      } else {
        weakTopics.push(topic);
      }

      localReviews.push({
        orderIndex: idx,
        questionId: q.id || `local-${idx}`,
        topic,
        scenario: q.scenario,
        options: q.options || [],
        selectedOptionIndex: answers[idx] ?? null,
        correctOptionIndex: q.correct ?? 0,
        isCorrect,
        explain: q.explanation || q.explain || '',
      });
    });

    updateTestResults({
      score: correctCount,
      total: questions.length,
      timeUsed,
      topicBreakdown,
      weakTopics: [...new Set(weakTopics)],
    });
    setQuestionReviews(localReviews);

    setIsSubmitting(false);
    setViewState('results');
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Intro View */}
      {viewState === 'intro' && (
        <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Guidelines & Rules */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
                  Step 4 of 5 · Test Karo
                </span>
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[#141A33] mt-2 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                  Server-Authoritative Technical Assessment
                </h2>
                <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
                  A proctored, server-timed technical exam measuring production code reasoning, concurrency, and architecture trade-offs across your domain.
                </p>
              </div>

              {/* Rules & Guidelines */}
              <div className="p-4 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl space-y-2.5 text-[12.5px] text-[#181B24]">
                <div className="flex items-center gap-2 font-bold text-[#141A33]">
                  <span>📋</span>
                  <span>Assessment Structure &amp; Honor Code:</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-[#767B8A]">
                  <li><strong>{questions.length} Scenario Questions</strong> loaded directly from the PostgreSQL assessment bank</li>
                  <li><strong>Strict Server-Authoritative Timer:</strong> {Math.round(totalTimeSeconds / 60)} minutes total (~90s per question)</li>
                  <li><strong>Formal Examination Flow:</strong> Correctness is masked server-side during the active test; your choices are quietly saved in real-time</li>
                  <li><strong>Question Palette:</strong> Navigate freely and toggle flags to review questions prior to submitting</li>
                  <li><strong>Passing Benchmark:</strong> Scoring <strong>70%+</strong> unlocks the official <strong>LucoHire Verified Ready</strong> credential in Step 5</li>
                </ul>
              </div>

              <div className="p-3 bg-[#E5F6EE]/40 border border-[#0E8F5F]/20 rounded-xl flex items-center gap-2.5 text-[11.5px] text-[#0E8F5F] font-medium">
                <span>💡</span>
                <span>All assessment answers directly feed into your composite readiness calculation and Step 5 30-day action plan.</span>
              </div>
            </div>

            {/* Right Column: Spec Summary & Start CTA */}
            <div className="md:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl p-5 space-y-4">
              <div className="text-[14px] font-bold text-[#141A33] border-b border-[#ECEAF9] pb-2">
                Assessment Overview
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#767B8A]">Total Questions</span>
                  <span className="font-bold text-[#141A33]">{questions.length} Questions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#767B8A]">Total Time Allowed</span>
                  <span className="font-bold text-[#5B21D6]">{Math.round(totalTimeSeconds / 60)} Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#767B8A]">Pace Guidance</span>
                  <span className="font-bold text-[#141A33]">~90s / Question</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#767B8A]">Passing Benchmark</span>
                  <span className="font-bold text-[#0E8F5F]">70% (Verified Ready)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#767B8A]">Format</span>
                  <span className="font-bold text-[#141A33]">Multiple-Choice Scenarios</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartTest}
                disabled={isLoadingTest}
                className="w-full py-3 px-4 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoadingTest ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Initiating Proctored Attempt...</span>
                  </>
                ) : (
                  <>
                    <span>Start Official Assessment Now</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Running View */}
      {viewState === 'running' && questions[currentQIndex] && (
        <TestRunnerCard
          questions={questions}
          currentIndex={currentQIndex}
          onJumpToIndex={(idx) => setCurrentQIndex(idx)}
          answers={answers}
          onPickAnswer={handlePickAnswer}
          flags={flags}
          onToggleFlag={handleToggleFlag}
          onPromptSubmit={() => setShowSubmitModal(true)}
          totalSeconds={totalTimeSeconds}
          onTimeExpired={handleConfirmSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Results View */}
      {viewState === 'results' && (
        <TestResultsCard
          score={testState?.score || 0}
          total={testState?.total || questions.length}
          timeUsed={testState?.timeUsed || 180}
          topicBreakdown={testState?.topicBreakdown || {}}
          questionReviews={questionReviews}
          onProceedToVerdict={() => goToStep(5)}
          onRetake={handleStartTest}
        />
      )}

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <TestSubmitModal
          answeredCount={answeredCount}
          totalCount={questions.length}
          flaggedCount={flaggedCount}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSubmitModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => goToStep(3)}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#E6E3F7] text-[12.5px] font-semibold text-[#5B6168] hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ← Back to Step 3: Practice
        </button>

        <button
          type="button"
          onClick={() => goToStep(5)}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Skip to Step 5: Final Verdict</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
