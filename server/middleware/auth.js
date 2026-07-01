import jwt from 'jsonwebtoken';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import Admin from '../models/Admin.js';

/**
 * Middleware to protect routes. Verifies the JWT token and attaches the authenticated Admin to the request object.
 */
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Extract token from authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication failed. Please login to get access.', 401));
  }

  // Verify token signature
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Session expired or invalid token. Please log in again.', 401));
  }

  // Find admin in database
  const currentAdmin = await Admin.findById(decoded.id);
  if (!currentAdmin) {
    return next(new AppError('The user account linked to this token no longer exists.', 401));
  }

  // Add user context to request
  req.user = currentAdmin;
  next();
});

/**
 * Middleware to restrict access based on roles.
 * @param {...string} roles - The allowed roles (e.g. 'superadmin')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Permission Denied. You do not have access to this action.', 403));
    }
    next();
  };
};
