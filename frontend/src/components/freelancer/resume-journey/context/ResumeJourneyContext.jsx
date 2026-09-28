import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useFreelancer } from '../../../../context/FreelancerContext';
import { toast } from 'react-hot-toast';
import { computeAtsScore, analyzeProfileSkills, recommendBestPath } from '../engine/atsScoringEngine';
import { calculateCompositeReadiness } from '../engine/readinessEngine';
import { resumeJourneyAPI } from '../../../../services/resumeJourneyAPI';

const ResumeJourneyContext = createContext(null);

const STORAGE_KEY = 'luco_resume_journey_v2';
const ALLOW_FREE_NAVIGATION = false; // Set to true per user request for smooth Step 1-5 testing

export function ResumeJourneyProvider({ children }) {
  const { profile, user, displayName, loadDashboardData } = useFreelancer();

  // Load cached progress from localStorage
  const savedState = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Step state (Free navigation across steps 1-5 for testing)
  const [activeStep, setActiveStep] = useState(savedState?.activeStep || 1);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(
    ALLOW_FREE_NAVIGATION ? 5 : (savedState?.highestUnlockedStep || 5)
  );

  // Selected Career Paths
  const [selectedPaths, setSelectedPaths] = useState(() => {
    if (savedState?.selectedPaths && savedState.selectedPaths.length > 0) {
      return savedState.selectedPaths;
    }
    return [recommendBestPath(profile)];
  });

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
      name: savedState?.resumeName || null,
      url: null,
      size: null,
      isReal: false,
    };
  }, [profile?.resumeUrl, savedState?.resumeName]);

  // Dynamic Resume Presence State (First-time user detection)
  const [hasResume, setHasResume] = useState(() => {
    return Boolean(profile?.resumeUrl || savedState?.hasResume);
  });

  useEffect(() => {
    if (profile?.resumeUrl) {
      setHasResume(true);
    }
  }, [profile?.resumeUrl]);

  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeFileInputRef = React.useRef(null);

  // Dynamic ATS Audit Data (Returned from backend top-tier 5-pillar engine)
  const [atsAuditData, setAtsAuditData] = useState(savedState?.atsAuditData || null);
  const [isLoadingAts, setIsLoadingAts] = useState(false);
  const [customAtsScore, setCustomAtsScore] = useState(savedState?.customAtsScore || null);

  // Fallback skills analysis if backend is unreachable
  const candidateSkills = useMemo(() => {
    if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
      return profile.skills;
    }
    return ['JavaScript', 'HTML5', 'CSS3'];
  }, [profile?.skills]);

  const fallbackSkillsAnalysis = useMemo(() => {
    return analyzeProfileSkills(candidateSkills);
  }, [candidateSkills]);

  // Dynamic ATS Score derived from backend audit or formula
  const atsScore = useMemo(() => {
    if (customAtsScore != null) return customAtsScore;
    if (atsAuditData?.atsScore != null) return atsAuditData.atsScore;
    return computeAtsScore(profile, null);
  }, [customAtsScore, atsAuditData?.atsScore, profile]);

  const skillsAnalysis = useMemo(() => {
    return atsAuditData?.skillsAnalysis || fallbackSkillsAnalysis;
  }, [atsAuditData?.skillsAnalysis, fallbackSkillsAnalysis]);

  // Step 2 Padhaao State (Dynamic 3-Tier Syllabus: Basic, Medium, Premium)
  const [padhaaoSyllabus, setPadhaaoSyllabus] = useState(
    savedState?.padhaaoSyllabus || null
  );
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [completedChapters, setCompletedChapters] = useState(
    savedState?.completedChapters || []
  );
  const [activeTrack, setActiveTrack] = useState(
    savedState?.activeTrack || 'basic'
  );

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
      status: 'intro',
      score: null,
      total: null,
      timeUsed: 0,
      weakTopics: [],
      topicBreakdown: {},
    }
  );

  const [serverData, setServerData] = useState(null);
  const [serverReadiness, setServerReadiness] = useState(null);
  const [serverCertificate, setServerCertificate] = useState(null);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);

  // Run ATS audit against backend
  const runAtsAudit = useCallback(async (pathSlug, overrideScore = null) => {
    const slug = pathSlug || selectedPaths[0] || 'p1';
    setIsLoadingAts(true);
    try {
      const res = await resumeJourneyAPI.getAtsAudit({
        careerPathSlug: slug,
        customScoreOverride: overrideScore ?? customAtsScore,
      });
      if (res?.data?.success && res.data.data) {
        setAtsAuditData(res.data.data);
        if (res.data.data.hasResume) {
          setHasResume(true);
        }
      }
    } catch (err) {
      console.warn('[ResumeJourney] ATS audit backend call fallback:', err.message);
    } finally {
      setIsLoadingAts(false);
    }
  }, [selectedPaths, customAtsScore]);

  // Load dynamic gap-driven syllabus from backend
  const loadPadhaaoSyllabus = useCallback(async (pathSlug) => {
    const slug = pathSlug || selectedPaths[0] || 'p1';
    setIsLoadingSyllabus(true);
    try {
      const res = await resumeJourneyAPI.getPadhaaoTracks(slug);
      if (res?.data?.success && res.data.data) {
        setPadhaaoSyllabus(res.data.data);
        if (Array.isArray(res.data.data.completedChapters) && res.data.data.completedChapters.length > 0) {
          setCompletedChapters((prev) => {
            const merged = new Set([...prev, ...res.data.data.completedChapters]);
            return Array.from(merged);
          });
        }
      }
    } catch (err) {
      console.warn('[ResumeJourney] Padhaao syllabus load fallback:', err.message);
    } finally {
      setIsLoadingSyllabus(false);
    }
  }, [selectedPaths]);

  // Dynamic Resume Upload Handler
  const handleResumeUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('careerPathSlug', selectedPaths[0] || 'p1');

    try {
      setUploadingResume(true);
      const res = await resumeJourneyAPI.uploadResume(formData);
      if (res?.data?.success) {
        setHasResume(true);
        if (res.data.data?.atsAudit) {
          setAtsAuditData(res.data.data.atsAudit);
        } else {
          await runAtsAudit(selectedPaths[0] || 'p1');
        }
        if (loadDashboardData) {
          loadDashboardData().catch(() => {});
        }
        toast.success('Resume uploaded, parsed, and dynamically benchmarked!');
      }
    } catch (err) {
      console.error('Resume upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload resume document');
    } finally {
      setUploadingResume(false);
    }
  };

  // Automated ATS Optimizer Handler
  const runAutoFixAts = async () => {
    try {
      const slug = selectedPaths[0] || 'p1';
      const res = await resumeJourneyAPI.autoFixAts({ careerPathSlug: slug });
      if (res?.data?.success && res.data.data) {
        const d = res.data.data;
        setCustomAtsScore(d.optimizedScore);
        // Instant update: use the pre-computed optimized audit directly
        if (d.atsAudit) {
          setAtsAuditData(d.atsAudit);
        } else {
          await runAtsAudit(slug, d.optimizedScore);
        }
        return d;
      }
      throw new Error('Auto-fix did not return data');
    } catch (err) {
      console.error('Auto-fix ATS error:', err);
      toast.error(err.response?.data?.message || 'Could not optimize resume automatically');
      return null;
    }
  };

  // Hydrate state from server on mount
  const refreshJourneyState = useCallback(async () => {
    try {
      const res = await resumeJourneyAPI.getState();
      if (res?.data?.success && res.data.data) {
        const d = res.data.data;
        setServerData(d);
        if (d.journeyState) {
          const js = d.journeyState;
          if (js.activeStep) setActiveStep(js.activeStep);
          if (ALLOW_FREE_NAVIGATION) {
            setHighestUnlockedStep(5);
          } else if (js.highestUnlockedStep) {
            setHighestUnlockedStep(js.highestUnlockedStep);
          }
          if (Array.isArray(js.selectedPaths) && js.selectedPaths.length > 0) {
            setSelectedPaths(js.selectedPaths);
          }
          if (js.customAtsScore != null) setCustomAtsScore(js.customAtsScore);
          if (Array.isArray(js.completedChapters)) setCompletedChapters(js.completedChapters);
          if (js.practiceState && typeof js.practiceState === 'object') {
            setPracticeState((prev) => ({ ...prev, ...js.practiceState }));
          }
          if (js.testState && typeof js.testState === 'object') {
            setTestState((prev) => ({ ...prev, ...js.testState }));
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    refreshJourneyState();
  }, [refreshJourneyState]);

  // Initial ATS Audit run on mount or profile load
  useEffect(() => {
    if (profile?.resumeUrl || hasResume) {
      runAtsAudit(selectedPaths[0] || 'p1');
    }
  }, [profile?.resumeUrl, hasResume, runAtsAudit, selectedPaths]);

  // Load Step 2 Padhaao Dynamic Syllabus whenever path or ATS audit updates
  useEffect(() => {
    loadPadhaaoSyllabus(selectedPaths[0] || 'p1');
  }, [selectedPaths, atsAuditData, loadPadhaaoSyllabus]);

  // Step 5 Dynamic Readiness Verdict: Combine client formula with server authoritative payload
  const loadReadinessVerdict = useCallback(async (forceRefresh = false) => {
    const slug = selectedPaths[0] || 'p1';
    setIsLoadingReadiness(true);
    try {
      const res = await resumeJourneyAPI.getReadiness(slug, { forceRefresh });
      if (res?.data?.success && res.data.data) {
        setServerReadiness(res.data.data);
        if (res.data.data.certificate) {
          setServerCertificate(res.data.data.certificate);
        } else if (res.data.data.combinedScore >= 70) {
          try {
            const certRes = await resumeJourneyAPI.getCertificate(slug);
            if (certRes?.data?.success && certRes.data.data) {
              setServerCertificate(certRes.data.data);
            }
          } catch {
            // Certificate unlock pending
          }
        }
      }
    } catch (err) {
      console.warn('[ResumeJourney] Load readiness verdict fallback:', err.message);
    } finally {
      setIsLoadingReadiness(false);
    }
  }, [selectedPaths]);

  // Load readiness automatically on Step 5
  useEffect(() => {
    if (activeStep === 5) {
      loadReadinessVerdict();
    }
  }, [activeStep, loadReadinessVerdict]);

  const readinessVerdict = useMemo(() => {
    const clientComputed = calculateCompositeReadiness({
      atsScore,
      testScore: testState?.score,
      testTotal: testState?.total,
      practiceScore: practiceState?.pScore,
      practiceTotal: practiceState?.pTotal,
    });

    if (serverReadiness) {
      return {
        ...clientComputed,
        combinedScore: serverReadiness.combinedScore ?? clientComputed.combinedScore,
        bandClass: serverReadiness.bandClass ?? clientComputed.bandClass,
        bandLabel: serverReadiness.bandLabel ?? clientComputed.bandLabel,
        percentile: serverReadiness.percentile ?? clientComputed.percentile,
        rankText: serverReadiness.rankText ?? clientComputed.rankText,
        planA: serverReadiness.planA,
        planB: serverReadiness.planB,
        actionPlan: serverReadiness.actionPlan,
        lessonsCompleted: serverReadiness.lessonsCompleted,
        totalLessons: serverReadiness.totalLessons,
        practiceReps: serverReadiness.practiceReps,
        isCached: serverReadiness.isCached,
      };
    }

    return clientComputed;
  }, [atsScore, testState?.score, testState?.total, practiceState?.pScore, practiceState?.pTotal, serverReadiness]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeStep,
          highestUnlockedStep: ALLOW_FREE_NAVIGATION ? 5 : highestUnlockedStep,
          selectedPaths,
          customAtsScore,
          hasResume,
          atsAuditData,
          padhaaoSyllabus,
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
    hasResume,
    atsAuditData,
    padhaaoSyllabus,
    currentResume?.name,
    completedChapters,
    activeTrack,
    practiceState,
    testState,
  ]);

  // Actions with server sync
  const goToStep = (stepNum) => {
    if (stepNum < 1 || stepNum > 5) return;
    setActiveStep(stepNum);
    setHighestUnlockedStep((prev) => Math.max(prev, stepNum));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resumeJourneyAPI.updateProgress({ activeStep: stepNum }).catch(() => {});
  };

  const togglePath = (pathId) => {
    setSelectedPaths([pathId]);
    resumeJourneyAPI.selectPaths([pathId]).catch(() => {});
    runAtsAudit(pathId);
  };

  const toggleChapterComplete = (chapterKey, chapterId) => {
    setCompletedChapters((prev) => {
      const next = prev.includes(chapterKey)
        ? prev.filter((k) => k !== chapterKey)
        : [...prev, chapterKey];
      return next;
    });
    resumeJourneyAPI.toggleChapter(chapterKey, chapterId).catch(() => {});
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

    resumeJourneyAPI.submitPractice({
      pathSlug: selectedPaths[0] || 'p1',
      modeKey: practiceState.mode || 'mixed',
      answers: [],
      currentStreak: streak || 0,
    }).catch(() => {});
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
    // Pre-warm server readiness verdict
    setTimeout(() => {
      loadReadinessVerdict(true);
    }, 300);
  };

  const resetJourney = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveStep(1);
    setHighestUnlockedStep(5);
    setCustomAtsScore(null);
    setAtsAuditData(null);
    setPadhaaoSyllabus(null);
    setCompletedChapters([]);
    setActiveTrack('basic');
    setPracticeState({ mode: 'mixed', streak: 0, pScore: 0, pTotal: 0, weakTopics: [], completedCount: 0 });
    setTestState({ status: 'intro', score: null, total: null, timeUsed: 0, weakTopics: [], topicBreakdown: {} });
    try {
      await resumeJourneyAPI.resetJourney();
    } catch {
      // offline reset succeeded locally
    }
    loadPadhaaoSyllabus('p1');
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
    hasResume,
    setHasResume,
    atsAuditData,
    isLoadingAts,
    runAtsAudit,
    runAutoFixAts,
    skillsAnalysis,
    currentResume,
    padhaaoSyllabus,
    isLoadingSyllabus,
    loadPadhaaoSyllabus,
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
    serverData,
    refreshJourneyState,
    user,
    displayName,
    serverReadiness,
    serverCertificate,
    isLoadingReadiness,
    loadReadinessVerdict,
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
