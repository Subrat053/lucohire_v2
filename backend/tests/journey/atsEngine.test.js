const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeFivePillarAtsScore,
  generateDynamicLineFixes,
  generateDynamicRoadmap,
} = require('../../services/resumeJourney/atsEngine.service');
const {
  calculatePathMatchProbability,
  PATH_SPECIFICATIONS,
} = require('../../services/resumeJourney/careerPath.service');

describe('Top-Tier 5-Pillar ATS Engine Unit Tests', () => {
  test('computeFivePillarAtsScore computes balanced score and distinct components', () => {
    const testCanonical = {
      skills: ['JavaScript', 'React', 'HTML5', 'CSS3', 'Tailwind CSS', 'Git', 'REST API'],
      workExperience: [
        {
          role: 'Frontend Engineer',
          company: 'TechCorp',
          description: 'Engineered scalable user dashboard using React and Tailwind, improving client load time by 38% for 45,000 monthly users.',
        },
      ],
      education: [{ degree: 'B.Tech', institution: 'State University' }],
      email: 'engineer@example.com',
      phone: '+91 9876543210',
      headline: 'Frontend Engineer',
      bio: 'Passionate developer building high-performance web applications.',
      portfolioLinks: [{ platform: 'GitHub', url: 'https://github.com/test' }],
    };

    const result = computeFivePillarAtsScore({
      canonicalData: testCanonical,
      profile: { experience: '2' },
      careerPathSlug: 'p1',
      rawText: 'Engineered scalable user dashboard using React and Tailwind 38% 45,000 monthly users',
    });

    assert.ok(result.totalScore >= 70 && result.totalScore <= 98, `Score ${result.totalScore} should be in solid range`);
    assert.equal(result.components.length, 5, 'Should return exactly 5 ATS evaluation pillars');
    assert.ok(result.metricsCount >= 2, 'Should detect metrics');
    assert.ok(result.actionVerbMatches >= 1, 'Should detect strong action verbs');
  });

  test('Pillar 2 penalizes passive language and rewards quantified metrics', () => {
    const passiveResume = {
      skills: ['React'],
      workExperience: [
        {
          role: 'Developer',
          company: 'Acme',
          description: 'Worked on web pages. Responsible for updating and maintaining features. Helped with testing.',
        },
      ],
    };

    const activeResume = {
      skills: ['React'],
      workExperience: [
        {
          role: 'Developer',
          company: 'Acme',
          description: 'Architected and shipped customer checkout flow, reducing latency by 45% and boosting conversions by $120K.',
        },
      ],
    };

    const passiveResult = computeFivePillarAtsScore({ canonicalData: passiveResume, careerPathSlug: 'p1' });
    const activeResult = computeFivePillarAtsScore({ canonicalData: activeResume, careerPathSlug: 'p1' });

    assert.ok(
      activeResult.components[1].score > passiveResult.components[1].score,
      'Active quantified resume must score higher on Pillar 2 than passive resume'
    );
  });

  test('calculatePathMatchProbability calculates heuristic probability and tailored quick wins', () => {
    const candidateSkills = ['JavaScript', 'React', 'HTML5', 'CSS3', 'Tailwind CSS'];
    const p1Heuristic = calculatePathMatchProbability(candidateSkills, 2, 'p1', 75);
    const p3Heuristic = calculatePathMatchProbability(candidateSkills, 2, 'p3', 75);

    assert.ok(p1Heuristic.probability > p3Heuristic.probability, 'Fast Track match should be higher than Senior track for 2-yr frontend profile');
    assert.ok(p1Heuristic.quickWins.length === 3, 'Must provide 3 quick wins');
    assert.ok(p1Heuristic.matchedSkills.includes('React'), 'React must be in matched skills');
    assert.ok(p1Heuristic.missingSkills.includes('Git') || p1Heuristic.missingSkills.includes('REST API'), 'Missing core skills must be flagged');
  });

  test('generateDynamicLineFixes produces actionable Before vs After bullet points', () => {
    const canonical = {
      workExperience: [
        {
          role: 'Web Dev',
          company: 'XYZ Agency',
          description: 'Worked on the company website using JavaScript and CSS.',
        },
      ],
    };

    const fixes = generateDynamicLineFixes(canonical);
    assert.ok(Array.isArray(fixes) && fixes.length >= 3, 'Should generate at least 3 line fixes');
    assert.ok(fixes.some((f) => f.tag === 'Rewrite'), 'Must include rewrite fix');
    assert.ok(fixes.some((f) => f.tag === 'Remove'), 'Must recommend removing obsolete references line');
    assert.ok(fixes.every((f) => f.before && f.after && f.why), 'Every fix must have before, after, and why');
  });

  test('generateDynamicRoadmap adapts to AI vs Standard engineering trajectories', () => {
    const frontendRoadmap = generateDynamicRoadmap({}, 'p1');
    const aiRoadmap = generateDynamicRoadmap({}, 'p3');

    assert.ok(frontendRoadmap.length === 3);
    assert.ok(aiRoadmap.length === 3);
    assert.ok(aiRoadmap[0].title.toLowerCase().includes('ai') || aiRoadmap[1].title.toLowerCase().includes('rag'), 'AI roadmap must mention AI/RAG');
    assert.ok(frontendRoadmap[0].title.toLowerCase().includes('next.js') || frontendRoadmap[0].title.toLowerCase().includes('modern'), 'Frontend roadmap must emphasize modern architecture');
  });
});
