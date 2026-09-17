function normalizeId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return String(value.id ?? value._id ?? value);
  return String(value);
}

function isValidId(value) {
  const normalized = normalizeId(value);
  return Boolean(normalized && normalized.length <= 191 && /^[A-Za-z0-9_-]+$/.test(normalized));
}

module.exports = {
  isValidId,
  normalizeId,
};

