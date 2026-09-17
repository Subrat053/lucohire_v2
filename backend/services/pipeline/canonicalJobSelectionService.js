const JobPost = require('../../models/JobPost');
const JobSourceVersion = require('../../models/pipeline/JobSourceVersion');
const DuplicateGroup = require('../../models/pipeline/DuplicateGroup');

/**
 * Decides which source version should be the main canonical job.
 */

const selectCanonicalVersion = async (duplicateGroupId) => {
  const duplicateGroup = await DuplicateGroup.findById(duplicateGroupId).populate('duplicateSourceVersionIds');
  
  if (!duplicateGroup || !duplicateGroup.duplicateSourceVersionIds || duplicateGroup.duplicateSourceVersionIds.length === 0) {
    return null;
  }

  const versions = duplicateGroup.duplicateSourceVersionIds;

  // Selection priority order:
  // 1. Higher source confidence score (e.g. company career page > ATS > aggregator)
  // 2. Completeness score
  // 3. Freshness (most recent)

  versions.sort((a, b) => {
    // 1. Source confidence
    if (a.sourceConfidenceScore !== b.sourceConfidenceScore) {
      return b.sourceConfidenceScore - a.sourceConfidenceScore;
    }
    // 2. Completeness
    if (a.completenessScore !== b.completenessScore) {
      return b.completenessScore - a.completenessScore;
    }
    // 3. Freshness
    const dateA = new Date(a.rawPayload?.postedDate || a.firstSeenAt).getTime();
    const dateB = new Date(b.rawPayload?.postedDate || b.firstSeenAt).getTime();
    return dateB - dateA;
  });

  const bestVersion = versions[0];
  
  // Set others to false, best to true
  for (const v of versions) {
    v.isCanonical = (v._id.toString() === bestVersion._id.toString());
    await v.save();
  }

  return bestVersion;
};

module.exports = {
  selectCanonicalVersion
};
