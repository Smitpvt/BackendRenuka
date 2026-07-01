import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Signs a JWT token for the user.
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Logs in an admin user.
 */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate request parameters
  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  // Find user and select password field
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

  if (!admin || !(await admin.comparePassword(password, admin.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  // Sign JWT
  const token = signToken(admin._id);

  // Return response
  res.status(200).json({
    success: true,
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    }
  });
});

/**
 * Fetches profile of the currently logged-in user.
 */
export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    admin: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});
