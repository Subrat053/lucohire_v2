const crypto = require('crypto');
const StagingCandidate = require('../../models/StagingCandidate');
const User = require('../../models/User');

const generateHash = (str) => {
  if (!str) return null;
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
};

const checkDuplicate = async (candidateData) => {
  const emailHash = candidateData.email ? generateHash(candidateData.email) : null;
  const phoneHash = candidateData.phone ? generateHash(candidateData.phone) : null;
  
  // 1. Check live User profiles first (we don't want to re-import live candidates)
  if (emailHash || phoneHash) {
    const liveUserConditions = [];
    if (emailHash) liveUserConditions.push({ email: candidateData.email }); // assuming email isn't hashed in User
    if (phoneHash) liveUserConditions.push({ phone: candidateData.phone });
    
    if (liveUserConditions.length > 0) {
      const liveUser = await User.findOne({ $or: liveUserConditions });
      if (liveUser) {
        return { isDuplicate: true, duplicateType: 'live_user', record: liveUser };
      }
    }
  }

  // 2. Check Staging Candidates
  const stagingConditions = [];
  if (emailHash) stagingConditions.push({ email: candidateData.email }); // Assuming we store email plain and can just match, or we could match hashes
  if (phoneHash) stagingConditions.push({ phone: candidateData.phone });

  if (stagingConditions.length > 0) {
    const stagingUser = await StagingCandidate.findOne({ $or: stagingConditions });
    if (stagingUser) {
      return { isDuplicate: true, duplicateType: 'staging', record: stagingUser };
    }
  }

  return { isDuplicate: false };
};

module.exports = {
  generateHash,
  checkDuplicate
};
