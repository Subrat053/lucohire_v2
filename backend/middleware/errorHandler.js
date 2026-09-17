const { getPrismaHttpError } = require('../utils/prismaError');

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'ROUTE_NOT_FOUND',
      details: `${req.method} ${req.originalUrl}`,
    },
  });
};

const errorHandler = (err, req, res, next) => {
  const prismaError = getPrismaHttpError(err);
  let statusCode = prismaError?.status || err.statusCode || err.status || 500;

  if (err?.name === 'MulterError' && err?.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    err.message = 'Uploaded file is too large.';
    err.code = 'FILE_TOO_LARGE';
    err.details = { limitBytes: req?.fileSizeLimit || null };
  }

  const code = prismaError?.code || err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  let details = prismaError?.details || err.details || null;

  if (!details && process.env.NODE_ENV !== 'production' && err.stack) {
    details = err.stack;
  }

  const payload = {
    success: false,
    message: prismaError?.message || err.message || 'Internal server error',
    error: {
      code,
      details,
    },
  };

  res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler,
};
