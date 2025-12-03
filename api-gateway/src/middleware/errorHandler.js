const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // Log error with full context
  logger.error("Unhandled error", {
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err.code,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    },
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
