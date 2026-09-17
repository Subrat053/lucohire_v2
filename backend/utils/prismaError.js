const PRISMA_HTTP_ERRORS = Object.freeze({
  P2002: { status: 409, code: 'DUPLICATE_FIELD', message: 'Duplicate field value' },
  P2003: { status: 409, code: 'INVALID_RELATION', message: 'Invalid relation reference' },
  P2025: { status: 404, code: 'RECORD_NOT_FOUND', message: 'Record not found' },
});

function getPrismaHttpError(error) {
  const mapped = PRISMA_HTTP_ERRORS[error?.code];
  if (!mapped) return null;

  return {
    ...mapped,
    details: error?.meta || null,
  };
}

function handlePrismaError(error, res) {
  const mapped = getPrismaHttpError(error);
  if (!mapped) return false;

  res.status(mapped.status).json({
    success: false,
    message: mapped.message,
    error: {
      code: mapped.code,
      details: mapped.details,
    },
  });
  return true;
}

module.exports = {
  getPrismaHttpError,
  handlePrismaError,
};

