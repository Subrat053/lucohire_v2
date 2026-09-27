const fs = require('fs');
const path = require('path');

const models = [
  'CareerPath', 'SkillTaxonomy', 'SkillAlias', 'JourneyTopic', 'CareerPathSkill',
  'LearningTrack', 'LearningChapter', 'ChapterCompletion', 'PracticeMode',
  'PracticeQuestion', 'PracticeAttempt', 'PracticeAnswer', 'TopicPerformance',
  'AssessmentConfiguration', 'AssessmentQuestion', 'AssessmentAttempt',
  'AssessmentAttemptQuestion', 'AssessmentAnswer', 'CandidateResume',
  'ResumeVersion', 'ResumeEvidence', 'ATSScoringConfiguration', 'ATSScoringRule',
  'ATSScoringResult', 'ReadinessConfiguration', 'ReadinessBand', 'ReadinessResult',
  'JourneyCertificate', 'CandidateActionPlan', 'LeadEligibilityRule',
  'RecommendationEventLog', 'JourneyAuditLog', 'FreelancerJourneyState'
];

const modelsDir = path.join(__dirname, '..', 'models');
models.forEach(m => {
  const filePath = path.join(modelsDir, `${m}.js`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `// Resume Journey Model\nmodule.exports = require('../repositories/prismaModel')('${m}');\n`);
    console.log(`Created models/${m}.js`);
  }
});
console.log('Finished generating model files.');
