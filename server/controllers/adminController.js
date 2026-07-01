import Admin from '../models/Admin.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Lists all active (non-deleted) admins with optional search and pagination.
 */
export const getAllAdmins = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 10 } = req.query;

  // Initial query to filter out soft-deleted items
  let query = { isDeleted: { $ne: true } };

  // Substring search filtering
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Retrieve total count and items
  const total = await Admin.countDocuments(query);
  const admins = await Admin.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    admins
  });
});

/**
 * Creates a new admin account.
 */
export const createAdmin = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email, and password.', 400));
  }

  // Pre-check duplicate email
  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An admin account with this email address already exists.', 400));
  }

  const newAdmin = await Admin.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role || 'admin'
  });

  // Strip password from output
  newAdmin.password = undefined;

  res.status(201).json({
    success: true,
    admin: newAdmin
  });
});

/**
 * Soft deletes an admin account.
 */
export const deleteAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);

  if (!admin) {
    return next(new AppError('No admin found with that ID.', 404));
  }

  // Prevent self-deletion
  if (admin._id.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot delete your own admin account.', 400));
  }

  // Soft delete execution
  admin.isDeleted = true;
  admin.deletedAt = new Date();
  await admin.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Admin deleted successfully.'
  });
});
