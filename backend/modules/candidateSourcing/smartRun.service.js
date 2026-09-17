const SourceConnector = require('../../models/SourceConnector');
const SourceRunLog = require('../../models/SourceRunLog');
const StagingCandidate = require('../../models/StagingCandidate');
const CandidateActivityLog = require('../../models/CandidateActivityLog');
const { checkDuplicate, generateHash } = require('./dedupe.service');
const { calculateActiveScore } = require('./activeScore.service');
const crypto = require('crypto');

const processCandidateData = async (rawCandidates, runLogId, sourceConnector) => {
  let importedRecords = 0;
  let duplicateRecords = 0;
  let activeLeadsFound = 0;

  for (const raw of rawCandidates) {
    // Basic Normalization
    const candidateData = {
      name: raw.name || raw.full_name || 'Unknown',
      email: raw.email || raw.user_mail_id || '',
      phone: raw.phone || raw.mobile || '',
      jobTitle: raw.jobTitle || raw.designation || '',
      location: raw.location || raw.city_name || '',
      skills: Array.isArray(raw.skills) ? raw.skills : (raw.skills_text ? raw.skills_text.split(',').map(s => s.trim()) : []),
      resumeUpdatedAt: raw.resumeUpdatedAt || raw.last_updated || null,
      openToWork: raw.openToWork || false,
      recentlyActive: raw.recentlyActive || false,
      noticePeriodAvailable: raw.noticePeriodAvailable || false,
      preferredJobTypeAvailable: raw.preferredJobTypeAvailable || false
    };

    const duplicateCheck = await checkDuplicate(candidateData);

    if (duplicateCheck.isDuplicate) {
      duplicateRecords++;
      // We could update the duplicate's active score if the new signal is stronger, but for now we skip creating a new one.
      continue;
    }

    const { score, leadStatus } = calculateActiveScore(candidateData);

    if (score >= 31) {
      activeLeadsFound++;
    }

    // Generate claim token
    const claimToken = crypto.randomBytes(32).toString('hex');
    const claimExpiresAt = new Date();
    claimExpiresAt.setDate(claimExpiresAt.getDate() + 30); // 30 days expiry

    const newCandidate = new StagingCandidate({
      ...candidateData,
      emailHash: generateHash(candidateData.email),
      phoneHash: generateHash(candidateData.phone),
      activeScore: score,
      leadStatus: leadStatus,
      claimToken,
      claimExpiresAt,
      status: 'staged'
    });

    await newCandidate.save();
    importedRecords++;

    // Log Activity
    await CandidateActivityLog.create({
      candidateId: newCandidate._id,
      eventType: 'imported',
      source: sourceConnector.sourceName
    });
  }

  // Update Run Log
  await SourceRunLog.findByIdAndUpdate(runLogId, {
    importedRecords,
    duplicateRecords,
    activeLeadsFound,
    status: 'Success',
    completedAt: new Date()
  });

  return { importedRecords, duplicateRecords, activeLeadsFound };
};

const executeSmartRun = async (sourceId, adminId, filters = {}) => {
  const source = await SourceConnector.findById(sourceId);
  if (!source) throw new Error('Source Connector not found');

  const runLog = new SourceRunLog({
    sourceId: source._id,
    adminId,
    filtersJson: filters,
    status: 'Running'
  });
  await runLog.save();

  try {
    let rawCandidates = [];
    
    // In Phase 1, we handle Native Forms, Webhooks, CSV directly in other controllers,
    // but if it's an API, we could fetch it here.
    // We'll mock the fetch based on source type.
    if (source.sourceType === 'REST API') {
      // Mock fetch
      rawCandidates = []; 
    }

    const result = await processCandidateData(rawCandidates, runLog._id, source);
    return result;

  } catch (error) {
    await SourceRunLog.findByIdAndUpdate(runLog._id, {
      status: 'Failed',
      errorMessage: error.message,
      completedAt: new Date()
    });
    throw error;
  }
};

module.exports = {
  executeSmartRun,
  processCandidateData
};
