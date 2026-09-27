const ResumeParserProvider = require('./parser.interface');
const { extractTextFromFile, extractBasicInfo } = require('../resumeExtractorService');
const { processAI } = require('../ai/aiPipelineService');

class InternalParserProvider extends ResumeParserProvider {
  async parse(buffer, mimeType, options = {}) {
    const rawText = await extractTextFromFile(buffer, mimeType);
    const basicInfo = extractBasicInfo(rawText);

    let aiData = {};
    let confidenceScore = 80;

    // Check if AI parsing is available
    const isAiEnabled = String(process.env.AI_FEATURES_ENABLED || '').toLowerCase() === 'true';
    if (isAiEnabled && options.userId) {
      try {
        const pipelineResult = await processAI({
          userId: options.userId,
          role: 'provider',
          featureName: 'resume_parser',
          inputData: { input_data: rawText.slice(0, 7500) },
        });

        if (pipelineResult?.data) {
          aiData = pipelineResult.data;
          confidenceScore = pipelineResult.confidence_score || 85;
        }
      } catch (aiErr) {
        console.warn('[InternalParser] AI parse fallback to deterministic rules:', aiErr.message);
      }
    }

    // Merge deterministic extraction with AI
    const canonicalData = {
      fullName: basicInfo.fullName || aiData.fullName || 'Candidate',
      email: basicInfo.email || aiData.email || '',
      phone: basicInfo.phone || aiData.phone || '',
      city: aiData.city || '',
      state: aiData.state || '',
      headline: aiData.headline || '',
      bio: aiData.bio || '',
      skills: Array.isArray(aiData.skills) && aiData.skills.length > 0 ? aiData.skills : (basicInfo.skills || []),
      workExperience: Array.isArray(aiData.workExperience) ? aiData.workExperience : [],
      education: Array.isArray(aiData.education) ? aiData.education : [],
      projects: Array.isArray(aiData.projects) ? aiData.projects : [],
      portfolioLinks: Array.isArray(aiData.portfolioLinks) ? aiData.portfolioLinks : [],
      languages: Array.isArray(aiData.languages) ? aiData.languages : [],
      experienceYears: aiData.experienceYears || '2',
    };

    // Build evidence provenance model
    const evidences = [];
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    // Extract evidence for skills
    if (Array.isArray(canonicalData.skills)) {
      canonicalData.skills.forEach((skill) => {
        const matchingLine = lines.find((l) => l.toLowerCase().includes(String(skill).toLowerCase()));
        evidences.push({
          entityType: 'skill',
          entityValue: skill,
          normalizedValue: String(skill).toLowerCase().trim(),
          sourceSection: matchingLine ? 'WORK_EXPERIENCE' : 'SKILLS_SUMMARY',
          pageNumber: 1,
          textEvidence: matchingLine ? matchingLine.slice(0, 160) : `Mentions skill ${skill}`,
          confidence: matchingLine ? 0.95 : 0.85,
        });
      });
    }

    // Extract evidence for experience
    if (Array.isArray(canonicalData.workExperience)) {
      canonicalData.workExperience.forEach((exp) => {
        if (exp.company || exp.role) {
          evidences.push({
            entityType: 'company',
            entityValue: exp.company || exp.role,
            normalizedValue: String(exp.company || exp.role).toLowerCase().trim(),
            sourceSection: 'EMPLOYMENT_HISTORY',
            pageNumber: 1,
            textEvidence: exp.description ? String(exp.description).slice(0, 160) : `Role: ${exp.role} at ${exp.company}`,
            confidence: 0.92,
          });
        }
      });
    }

    return {
      canonicalData,
      rawText,
      evidences,
      confidenceScore,
    };
  }
}

module.exports = InternalParserProvider;
