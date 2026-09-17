const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

const requireOperationalFlags = (...flags) => (req, res, next) => {
  const disabledFlags = flags.filter((flag) => !enabled(flag));
  if (disabledFlags.length === 0) return next();

  return res.status(503).json({
    success: false,
    code: 'OPERATION_DISABLED',
    message: `This operation is disabled. Enable: ${disabledFlags.join(', ')}.`,
  });
};

module.exports = { enabled, requireOperationalFlags };
