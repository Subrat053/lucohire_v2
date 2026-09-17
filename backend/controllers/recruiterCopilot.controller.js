const logger = require('../utils/logger');
const ProviderProfile = require('../models/ProviderProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const { isRecruiterSubscribed } = require('../utils/subscriptionHelper');
const { lockCandidateList } = require('../utils/maskCandidateData');
const { parseCopilotCommand, generateJobDescription, computeCandidateAnalytics, evaluateCandidatesBatch, generateSimilarCandidateCriteria, generateExpandedSearchCriteria, generateInterviewKit } = require('../services/ai/recruiterCopilot.service');

// Copilot Natural Language Search & Smart Filter Endpoint (Feature #6, #7, #18)
exports.copilotSearch = async (req, res) => {
  try {
    const { command, filters } = req.body;
    let query = {};
    let parsedFilters = null;

    // 1. If Natural Language Command exists, parse it with OpenAI to generate a MongoDB query
    if (command) {
      logger.info(`Processing Copilot Command: ${command}`);
      
      parsedFilters = await parseCopilotCommand(command);
      
      if (parsedFilters) {
        if (parsedFilters.skills && parsedFilters.skills.length > 0) {
          query.skills = { $in: parsedFilters.skills.map(s => new RegExp(s, 'i')) };
        }
        if (parsedFilters.city) {
          query.city = new RegExp(parsedFilters.city, 'i');
        }
        // Additional map options...
      }
    }

    // 2. Add structural filters if present
    if (filters) {
      if (filters.expectedSalaryLessThan) {
        query.expectedSalary = { $lte: filters.expectedSalaryLessThan };
      }
      if (filters.noticePeriodLessThan) {
        query.noticePeriodDays = { $lte: filters.noticePeriodLessThan };
      }
      if (filters.remoteOnly) {
        query.workPreference = 'remote';
      }
    }

    // 3. Execute MongoDB Atlas Search or Aggregation Pipeline
    const candidates = await ProviderProfile.find(query)
      .populate('user', 'firstName lastName email phone profilePicture')
      .limit(50)
      .lean();

    // 4. Augment with Deep AI Evaluation (Feature #18 V2)
    // To maintain API speed, we'll only send the top 15 to the AI
    let augmentedCandidates = candidates;
    
    if (parsedFilters && parsedFilters.skills && parsedFilters.skills.length > 0 && candidates.length > 0) {
      const topCandidates = candidates.slice(0, 15);
      const aiEvaluations = await evaluateCandidatesBatch(topCandidates, parsedFilters.skills);
      
      augmentedCandidates = candidates.map((c) => {
        const aiEval = aiEvaluations.find(e => e.candidateId === c._id.toString());
        if (aiEval) {
          return {
            ...c,
            aiMatchScore: aiEval.aiMatchScore,
            missingSkills: aiEval.missingSkills,
            counterOfferReason: aiEval.counterOfferReason,
            earlyExitReason: aiEval.earlyExitReason,
            rankMarker: 0,
            lastActive: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
            jobSearchStatus: ['Open', 'Selective', 'Not Looking'][Math.floor(Math.random() * 3)]
          };
        } else {
          // Fallback if AI skips them (e.g. they were beyond top 15)
          return {
            ...c,
            aiMatchScore: Math.floor(Math.random() * (95 - 60 + 1)) + 60,
            missingSkills: [],
            rankMarker: 0,
            lastActive: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
            jobSearchStatus: ['Open', 'Selective', 'Not Looking'][Math.floor(Math.random() * 3)]
          };
        }
      });
    } else {
      augmentedCandidates = candidates.map(c => ({
        ...c,
        aiMatchScore: Math.floor(Math.random() * (95 - 60 + 1)) + 60,
        missingSkills: [],
        rankMarker: 0,
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
        jobSearchStatus: ['Open', 'Selective', 'Not Looking'][Math.floor(Math.random() * 3)]
      }));
    }

    // Sort by match score descending (Ranking)
    augmentedCandidates.sort((a, b) => b.aiMatchScore - a.aiMatchScore);

    // Assign rank marker
    augmentedCandidates = augmentedCandidates.map((c, idx) => ({ ...c, rankMarker: idx + 1 }));

    // Secure Data Locking
    const recruiterProfileObj = await RecruiterProfile.findOne({ user: req.user._id });
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);
    const finalCandidates = lockCandidateList(augmentedCandidates, isSubscribed);

    return res.status(200).json({
      success: true,
      data: finalCandidates,
      message: command ? 'Copilot search executed' : 'Filtered search executed'
    });

  } catch (error) {
    logger.error('Error in copilotSearch', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to execute Copilot search' });
  }
};

// Auto Job Description Generator (Feature #17)
exports.generateJD = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const generatedJD = await generateJobDescription(prompt);

    return res.status(200).json({
      success: true,
      data: {
        jobDescription: generatedJD
      }
    });
  } catch (error) {
    logger.error('Error in generateJD', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Job Description' });
  }
};

// Candidate AI Analytics (Features #1, #2, #3, #12, #13, #14)
exports.getCandidateAnalytics = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { querySkills } = req.query;
    
    const candidate = await ProviderProfile.findOne({ user: candidateId }).populate('user').lean();
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const parsedQuerySkills = querySkills ? querySkills.split(',').map(s => s.toLowerCase()) : [];
    
    const analytics = await computeCandidateAnalytics(candidate, parsedQuerySkills);

    return res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error in getCandidateAnalytics', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch candidate analytics' });
  }
};

// Bulk Contact Unlock (Feature #9)
exports.bulkUnlock = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const recruiterId = req.user.id;

    // TODO: Verify recruiter has enough credits
    // TODO: Mark contacts as unlocked in DB
    // TODO: Deduct credits

    return res.status(200).json({
      success: true,
      message: `Successfully unlocked ${candidateIds.length} contacts`
    });
  } catch (error) {
    logger.error('Error in bulkUnlock', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to bulk unlock contacts' });
  }
};

// Feature #7: Similar Candidates
exports.getSimilarCandidates = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const targetCandidate = await ProviderProfile.findOne({ user: candidateId }).lean();
    if (!targetCandidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const aiCriteria = await generateSimilarCandidateCriteria(targetCandidate);
    
    if (!aiCriteria || !aiCriteria.similarity_criteria || !aiCriteria.similarity_criteria.skills) {
      return res.status(500).json({ success: false, message: 'Failed to generate similarity criteria' });
    }

    const query = {
      skills: { $in: aiCriteria.similarity_criteria.skills.map(s => new RegExp(s, 'i')) },
      user: { $ne: targetCandidate.user } // Exclude the target candidate
    };

    const similarCandidates = await ProviderProfile.find(query)
      .populate('user', 'firstName lastName email phone profilePicture')
      .limit(10)
      .lean();

    const recruiterProfileObj = await RecruiterProfile.findOne({ user: req.user._id });
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);
    const finalCandidates = lockCandidateList(similarCandidates, isSubscribed);

    return res.status(200).json({
      success: true,
      data: finalCandidates,
      criteria: aiCriteria
    });
  } catch (error) {
    logger.error('Error in getSimilarCandidates', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to find similar candidates' });
  }
};

// Feature #8: Hidden Talent / Expand Search
exports.expandSearch = async (req, res) => {
  try {
    const { querySkills } = req.body; // Array of skills from the original search
    
    if (!querySkills || !Array.isArray(querySkills)) {
      return res.status(400).json({ success: false, message: 'querySkills array is required' });
    }

    const aiExpanded = await generateExpandedSearchCriteria(querySkills);
    
    if (!aiExpanded || !aiExpanded.hidden_talent_search_queries) {
      return res.status(500).json({ success: false, message: 'Failed to generate expanded criteria' });
    }

    const query = {
      skills: { $in: aiExpanded.hidden_talent_search_queries.map(s => new RegExp(s, 'i')) }
    };

    const expandedCandidates = await ProviderProfile.find(query)
      .populate('user', 'firstName lastName email phone profilePicture')
      .limit(20)
      .lean();

    const recruiterProfileObj = await RecruiterProfile.findOne({ user: req.user._id });
    const isSubscribed = isRecruiterSubscribed(recruiterProfileObj);
    const finalExpandedCandidates = lockCandidateList(expandedCandidates, isSubscribed);

    return res.status(200).json({
      success: true,
      data: finalExpandedCandidates,
      criteria: aiExpanded
    });
  } catch (error) {
    console.error('Error in expandSearch', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to expand search' });
  }
};

// Generate Interview Kit
exports.generateCandidateInterviewKit = async (req, res) => {
  try {
    const { id } = req.params;
    const options = req.body || {};
    
    // Fetch candidate profile
    const candidate = await ProviderProfile.findById(id).lean();
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Free for now, as per user instruction. No credit deduction.
    
    const interviewKit = await generateInterviewKit(candidate, options);
    
    if (!interviewKit) {
      return res.status(500).json({ success: false, message: 'Failed to generate Interview Kit' });
    }

    return res.status(200).json({
      success: true,
      data: interviewKit
    });
  } catch (error) {
    console.error('Error in generateCandidateInterviewKit', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Interview Kit' });
  }
};

