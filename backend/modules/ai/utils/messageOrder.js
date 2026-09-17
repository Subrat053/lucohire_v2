function normalizeDate(value) {
  const date = value ? new Date(value) : new Date(0);
  if (Number.isNaN(date.getTime())) return new Date(0);
  return date;
}

function compareMessageOrderAsc(a, b) {
  const aTime = normalizeDate(a.createdAt).getTime();
  const bTime = normalizeDate(b.createdAt).getTime();

  if (aTime !== bTime) return aTime - bTime;

  const aId = String(a._id || a.id || '');
  const bId = String(b._id || b.id || '');
  if (aId < bId) return -1;
  if (aId > bId) return 1;
  return 0;
}

function sortMessagesAsc(messages = []) {
  return [...messages].sort(compareMessageOrderAsc);
}

function dedupeMessages(messages = []) {
  const byId = new Map();
  messages.forEach((item) => {
    const key = String(item._id || item.id || item.clientMessageId || '');
    if (!key) return;
    byId.set(key, item);
  });
  return Array.from(byId.values());
}

module.exports = {
  compareMessageOrderAsc,
  sortMessagesAsc,
  dedupeMessages,
};
