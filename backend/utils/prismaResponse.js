function withLegacyId(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  if (!Object.prototype.hasOwnProperty.call(record, 'id')) return record;

  return {
    ...record,
    _id: record.id,
  };
}

function withLegacyIds(records) {
  return Array.isArray(records) ? records.map(withLegacyId) : withLegacyId(records);
}

module.exports = {
  withLegacyId,
  withLegacyIds,
};

