import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useFreelancer } from '../../../../context/FreelancerContext';
import { toast } from 'react-hot-toast';
import { computeAtsScore, analyzeProfileSkills, recommendBestPath } from '../engine/atsScoringEngine';
import { calculateCompositeReadiness } from '../engine/readinessEngine';

const ResumeJourneyContext = createContext(null);

const STORAGE_KEY = 'luco_resume_journey_v2';

export function ResumeJourneyProvider({ children }) {
  const { profile, uploadingResume, handleResumeUpload, resumeFileInputRef } = useFreelancer();

  // Load cached progress from localStorage
  const savedState = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Step state
  const [activeStep, setActiveStep] = useState(savedState?.activeStep || 1);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(savedState?.highestUnlockedStep || 5);

  // Selected Career Paths
  const [selectedPaths, setSelectedPaths] = useState(() => {
    if (savedState?.selectedPaths && savedState.selectedPaths.length > 0) {
      return savedState.selectedPaths;
    }
    return [recommendBestPath(profile)];
  });

  // Dynamic Skills & ATS Score
  const candidateSkills = useMemo(() => {
    if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
      return profile.skills;
    }
    return ['JavaScript', 'HTML5', 'CSS3', 'jQuery'];
  }, [profile?.skills]);

  const skillsAnalysis = useMemo(() => {
    return analyzeProfileSkills(candidateSkills);
  }, [candidateSkills]);

  const [customAtsScore, setCustomAtsScore] = useState(savedState?.customAtsScore || null);

  const atsScore = useMemo(() => {
    return computeAtsScore(profile, customAtsScore);
  }, [profile, customAtsScore]);

  // Current Resume Meta
  const currentResume = useMemo(() => {
    if (profile?.resumeUrl) {
      const urlParts = profile.resumeUrl.split('/');
      const rawName = urlParts[urlParts.length - 1] || 'My_Resume.pdf';
      const cleanName = rawName.includes('?') ? rawName.split('?')[0] : rawName;
      return {
        name: decodeURIComponent(cleanName).replace(/^\d+[-_]/, ''),
        url: profile.resumeUrl,
        size: '1.2 MB',
        isReal: true,
      };
    }
    return {
      name: savedState?.resumeName || 'Resume_Draft_2026.pdf',
      url: null,
      size: '1.1 MB',
      isReal: false,
    };
  }, [profile?.resumeUrl, savedState?.resumeName]);

  // Step 2 Padhaao State
  const [completedChapters, setCompletedChapters] = useState(
    savedState?.completedChapters || ['qw-0'] // Git is done by default as quick win demo
  );
  const [activeTrack, setActiveTrack] = useState(savedState?.activeTrack || 'qw');

  // Step 3 Practice State
  const [practiceState, setPracticeState] = useState(
    savedState?.practiceState || {
      mode: 'mixed',
      streak: 0,
      pScore: 0,
      pTotal: 0,
      weakTopics: [],
      completedCount: 0,
    }
  );

  // Step 4 Test Assessment State
  const [testState, setTestState] = useState(
    savedState?.testState || {
      status: 'intro', // 'intro' | 'running' | 'submitted'
      score: null,
      total: null,
      timeUsed: 0,
      weakTopics: [],
      topicBreakdown: {},
    }
  );

  // Step 5 Dynamic Readiness Verdict
  const readinessVerdict = useMemo(() => {
    return calculateCompositeReadiness({
      atsScore,
      testScore: testState?.score,
      testTotal: testState?.total,
      practiceScore: practiceState?.pScore,
      practiceTotal: practiceState?.pTotal,
    });
  }, [atsScore, testState?.score, testState?.total, practiceState?.pScore, practiceState?.pTotal]);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeStep,
          highestUnlockedStep,
          selectedPaths,
          customAtsScore,
          resumeName: currentResume?.name,
          completedChapters,
          activeTrack,
          practiceState,
          testState,
        })
      );
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [
    activeStep,
    highestUnlockedStep,
    selectedPaths,
    customAtsScore,
    currentResume?.name,
    completedChapters,
    activeTrack,
    practiceState,
    testState,
  ]);

  // Actions
  const goToStep = (stepNum) => {
    if (stepNum < 1 || stepNum > 5) return;
    setActiveStep(stepNum);
    setHighestUnlockedStep((prev) => Math.max(prev, stepNum));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePath = (pathId) => {
    setSelectedPaths((prev) => {
      if (prev.includes(pathId)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((p) => p !== pathId);
      }
      return [...prev, pathId];
    });
  };

  const toggleChapterComplete = (chapterKey) => {
    setCompletedChapters((prev) => {
      const next = prev.includes(chapterKey)
        ? prev.filter((k) => k !== chapterKey)
        : [...prev, chapterKey];
      return next;
    });
  };

  const updatePracticeResults = ({ score, total, weakTopics, streak }) => {
    setPracticeState((prev) => ({
      ...prev,
      pScore: score,
      pTotal: total,
      weakTopics: weakTopics || [],
      streak: streak ?? prev.streak,
      completedCount: (prev.completedCount || 0) + 1,
    }));
  };

  const updateTestResults = ({ score, total, timeUsed, topicBreakdown, weakTopics }) => {
    setTestState({
      status: 'submitted',
      score,
      total,
      timeUsed,
      topicBreakdown: topicBreakdown || {},
      weakTopics: weakTopics || [],
    });
    setHighestUnlockedStep(5);
  };

  const resetJourney = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveStep(1);
    setHighestUnlockedStep(5);
    setCustomAtsScore(null);
    setCompletedChapters(['qw-0']);
    setPracticeState({ mode: 'mixed', streak: 0, pScore: 0, pTotal: 0, weakTopics: [], completedCount: 0 });
    setTestState({ status: 'intro', score: null, total: null, timeUsed: 0, weakTopics: [], topicBreakdown: {} });
    toast.success('Journey progress reset');
  };

  const value = {
    profile,
    uploadingResume,
    handleResumeUpload,
    resumeFileInputRef,
    activeStep,
    goToStep,
    highestUnlockedStep,
    selectedPaths,
    setSelectedPaths,
    togglePath,
    atsScore,
    setCustomAtsScore,
    skillsAnalysis,
    currentResume,
    completedChapters,
    toggleChapterComplete,
    activeTrack,
    setActiveTrack,
    practiceState,
    setPracticeState,
    updatePracticeResults,
    testState,
    setTestState,
    updateTestResults,
    readinessVerdict,
    resetJourney,
  };

  return (
    <ResumeJourneyContext.Provider value={value}>
      {children}
    </ResumeJourneyContext.Provider>
  );
}

export function useResumeJourney() {
  const context = useContext(ResumeJourneyContext);
  if (!context) {
    throw new Error('useResumeJourney must be used within a ResumeJourneyProvider');
  }
  return context;
}
