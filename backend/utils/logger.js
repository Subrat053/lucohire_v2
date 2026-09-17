function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify({ error: 'log_serialize_failed' });
  }
}

function log(level, message, meta = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    message,
    meta,
  };

  const line = safeJson(record);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
