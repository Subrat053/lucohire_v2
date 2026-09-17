const { processCandidateData } = require('./smartRun.service');
const SourceConnector = require('../../models/SourceConnector');
const SourceRunLog = require('../../models/SourceRunLog');

const importFromCsv = async (csvRecords, sourceId, adminId) => {
  const source = await SourceConnector.findById(sourceId);
  if (!source) throw new Error('Source Connector not found');

  const runLog = new SourceRunLog({
    sourceId: source._id,
    adminId,
    status: 'Running'
  });
  await runLog.save();

  try {
    const result = await processCandidateData(csvRecords, runLog._id, source);
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

module.exports = { importFromCsv };
