const CandidateJobMatch = require('../../models/CandidateJobMatch');
const JobPost = require('../../models/JobPost');

/**
 * Get recommended jobs for the logged-in candidate
 */
const getRecommendedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch matches with a high match score sorted by score desc
    const matches = await CandidateJobMatch.find({ userId })
      .sort({ matchScore: -1 })
      .limit(30)
      .lean();

    const recommendedJobs = [];

    for (const match of matches) {
      let jobDetails = await JobPost.findOne({ _id: match.jobId }).populate('recruiter', 'name').lean();
      
      if (jobDetails) {
        if (!jobDetails.isExternal) {
          recommendedJobs.push({
            ...jobDetails,
            matchScore: match.matchScore,
            isExternal: false,
            job_origin: 'internal',
            apply_mode: 'internal_apply',
            apply_url: jobDetails.externalUrl || '',
            skills: jobDetails.skill ? [jobDetails.skill] : []
          });
        } else {
          recommendedJobs.push({
            ...jobDetails,
            matchScore: match.matchScore,
            isExternal: true,
            job_origin: jobDetails.jobOrigin || 'ats',
            apply_mode: jobDetails.applyMode || 'external_redirect',
            apply_url: jobDetails.applyUrl || jobDetails.externalUrl || '',
            skills: jobDetails.skillsTags || []
          });
        }
      }
    }

    res.json({ jobs: recommendedJobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get Saved Jobs for the candidate
 */
const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user._id;
    const matches = await CandidateJobMatch.find({ userId, savedAt: { $ne: null } }).lean();

    const savedJobs = [];
    for (const match of matches) {
      let jobDetails = await JobPost.findById(match.jobId).populate('recruiter', 'name').lean();
      if (jobDetails) {
        if (!jobDetails.isExternal) {
          savedJobs.push({ 
            ...jobDetails, 
            isExternal: false, 
            job_origin: 'internal', 
            apply_mode: 'internal_apply', 
            apply_url: jobDetails.externalUrl || '',
            skills: jobDetails.skill ? [jobDetails.skill] : []
          });
        } else {
          savedJobs.push({ 
            ...jobDetails, 
            isExternal: true, 
            job_origin: jobDetails.jobOrigin || 'ats', 
            apply_mode: jobDetails.applyMode || 'external_redirect', 
            apply_url: jobDetails.applyUrl || jobDetails.externalUrl || '', 
            skills: jobDetails.skillsTags || [] 
          });
        }
      }
    }

    res.json({ jobs: savedJobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Save / Unsaves a job for the candidate
 */
const toggleSaveJob = async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.body; 

    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    let match = await CandidateJobMatch.findOne({ userId, jobId });
    if (!match) {
      match = new CandidateJobMatch({
        userId,
        jobId,
        jobCollection: 'JobPost',
        matchScore: 60 // Baseline fallback match score
      });
    }

    if (match.savedAt) {
      match.savedAt = null;
    } else {
      match.savedAt = new Date();
    }

    await match.save();
    res.json({ message: match.savedAt ? 'Job saved successfully' : 'Job unsaved successfully', isSaved: !!match.savedAt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Record a click/apply redirect for analytics
 */
const recordJobApplyClick = async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.params;

    let match = await CandidateJobMatch.findOne({ userId, jobId });
    if (!match) {
      match = new CandidateJobMatch({
        userId,
        jobId,
        jobCollection: 'JobPost',
        matchScore: 60
      });
    }

    match.appliedAt = new Date();
    await match.save();

    res.json({ message: 'Apply event tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getRecommendedJobs,
  getSavedJobs,
  toggleSaveJob,
  recordJobApplyClick
};
