import AppError from '../utils/appError.js';

// Helper to format invalid database ID errors (CastError)
const handleCastErrorDB = () => {
  return new AppError('Invalid resource identifier.', 400);
};

// Helper to format duplicate database values (duplicate key error)
const handleDuplicateFieldsDB = () => {
  return new AppError('A record with this value already exists.', 400);
};

// Helper to format mongoose schema validation errors
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Helper to format invalid JWT authentication errors
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

// Helper to format expired JWT authentication errors
const handleJWTExpiredError = () => new AppError('Session expired. Please log in again.', 401);

// Centralized express error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  // Normalize specific database and auth errors into operational errors
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    // Development Response: return detailed error maps and stack trace
    return res.status(error.statusCode).json({
      success: false,
      name: error.name,
      status: error.status,
      message: error.message,
      stack: err.stack,
      error: err
    });
  } else {
    // Production: Log the complete error on the server console
    console.error('ERROR 💥:', err);

    // Production Response: return sanitized, client-safe error messages
    if (error.isOperational) {
      // Expected operational errors (e.g. resource not found, validation error)
      return res.status(error.statusCode).json({
        success: false,
        status: error.status,
        message: error.message
      });
    }

    // Unexpected server or database driver errors
    // Return a generic message without exposing internal stack/implementation/secrets
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

export default globalErrorHandler;

