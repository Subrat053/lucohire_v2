// Dynamic ATS & Profile Skill Analysis Engine
import { OUTDATED, FADING, RISING, PATHS } from '../data/resumeStep1Data';

/**
 * Normalizes skill strings for case-insensitive matching
 */
export function normalizeSkill(skill) {
  if (!skill) return '';
  const s = typeof skill === 'string' ? skill : skill.name || skill.title || '';
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Cross-references candidate skills against Outdated, Fading, and Rising registries
 */
export function analyzeProfileSkills(candidateSkills = []) {
  const normUserSkills = candidateSkills.map(normalizeSkill).filter(Boolean);

  const isMatched = (skillName) => {
    const norm = normalizeSkill(skillName);
    return normUserSkills.some(us => us.includes(norm) || norm.includes(us));
  };

  // 1. Outdated skills check
  const outdatedFound = OUTDATED.map(item => ({
    ...item,
    inProfile: isMatched(item.skill)
  }));

  // 2. Fading skills check
  const fadingFound = FADING.map(item => ({
    ...item,
    inProfile: isMatched(item.skill)
  }));

  // 3. Rising modern skills check
  const risingAnalyzed = RISING.map(item => {
    const hasSkill = isMatched(item.skill);
    return {
      ...item,
      acquired: hasSkill,
      status: hasSkill ? 'Acquired (+₹4L)' : 'Recommended'
    };
  });

  const acquiredRising = risingAnalyzed.filter(s => s.acquired);
  const missingRising = risingAnalyzed.filter(s => !s.acquired);

  return {
    outdatedFound,
    fadingFound,
    risingAnalyzed,
    acquiredRising,
    missingRising,
    outdatedCount: outdatedFound.filter(s => s.inProfile).length,
    acquiredCount: acquiredRising.length
  };
}

/**
 * Computes dynamic ATS score based on profile completion, skills, and resume metadata
 */
export function computeAtsScore(profile, customAtsOverride = null) {
  if (customAtsOverride && typeof customAtsOverride === 'number') {
    return clampScore(customAtsOverride);
  }

  if (profile?.resumeScore?.overall) {
    return clampScore(profile.resumeScore.overall);
  }

  // Calculate dynamic baseline
  let score = 62; // standard entry baseline

  const skills = profile?.skills || [];
  const skillCount = Array.isArray(skills) ? skills.length : 0;

  // Add for skill richness
  if (skillCount >= 8) score += 8;
  else if (skillCount >= 4) score += 4;

  // Profile completion bonus
  const completion = profile?.profileCompletion || 0;
  if (completion >= 80) score += 8;
  else if (completion >= 50) score += 4;

  // Scan skills impact
  const analysis = analyzeProfileSkills(skills);
  score += Math.min(10, analysis.acquiredCount * 3); // bonus for rising skills
  score -= Math.min(8, analysis.outdatedCount * 3);  // penalty for outdated skills

  // Resume presence bonus
  if (profile?.resumeUrl) {
    score += 4;
  }

  return clampScore(score);
}

function clampScore(val) {
  return Math.max(35, Math.min(96, Math.round(val)));
}

/**
 * Recommends best career path (p1-p4) based on candidate profile
 */
export function recommendBestPath(profile) {
  const title = (profile?.title || profile?.desiredRole || '').toLowerCase();
  const skills = (profile?.skills || []).map(normalizeSkill).join(' ');

  if (title.includes('ai') || title.includes('ml') || skills.includes('openai') || skills.includes('rag')) {
    return 'p3';
  }
  if (title.includes('senior') || title.includes('lead') || title.includes('architect') || skills.includes('systemdesign')) {
    return 'p2';
  }
  if (title.includes('fullstack') || title.includes('full stack') || skills.includes('node') || skills.includes('database')) {
    return 'p4';
  }
  return 'p1'; // Fast track default
}
