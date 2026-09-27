const ResumeParserProvider = require('./parser.interface');
const { extractBasicInfo } = require('../resumeExtractorService');

class FallbackParserProvider extends ResumeParserProvider {
  async parse(buffer, mimeType, options = {}) {
    const rawText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    const basicInfo = extractBasicInfo(rawText);

    const canonicalData = {
      fullName: basicInfo.fullName || 'Candidate',
      email: basicInfo.email || '',
      phone: basicInfo.phone || '',
      city: '',
      state: '',
      headline: 'Software Engineer',
      bio: '',
      skills: basicInfo.skills || ['JavaScript', 'HTML', 'CSS', 'Node.js'],
      workExperience: [],
      education: [],
      projects: [],
      portfolioLinks: [],
      languages: ['English'],
      experienceYears: '2',
    };

    return {
      canonicalData,
      rawText: rawText.slice(0, 2000),
      evidences: [],
      confidenceScore: 60,
    };
  }
}

module.exports = FallbackParserProvider;
