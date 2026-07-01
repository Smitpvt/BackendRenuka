import Inquiry from '../models/Inquiry.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Creates a new booking inquiry from the public website forms.
 */
export const createInquiry = catchAsync(async (req, res, next) => {
  const { name, phone, pickup, destination, vehicleType, date, tripType, notes } = req.body;

  if (!name || !phone || !pickup || !destination || !vehicleType || !date || !tripType) {
    return next(new AppError('Please fill in all required fields.', 400));
  }

  const newInquiry = await Inquiry.create({
    name,
    phone,
    pickup,
    destination,
    vehicleType,
    date: new Date(date),
    tripType,
    notes: notes || ''
  });

  res.status(201).json({
    success: true,
    inquiry: newInquiry
  });
});

/**
 * Lists all active booking inquiries for the Admin Panel.
 * Supports status filters (All, Pending, Contacted, Completed), text search, and pagination.
 * Sorted newest first.
 */
export const getAllInquiries = catchAsync(async (req, res, next) => {
  const { search, status, page = 1, limit = 10 } = req.query;

  let query = { isDeleted: { $ne: true } };

  // Status filtering
  if (status && status !== 'All') {
    query.status = status;
  }

  // Search filtering
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { pickup: { $regex: search, $options: 'i' } },
      { destination: { $regex: search, $options: 'i' } },
      { vehicleType: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Inquiry.countDocuments(query);
  const inquiries = await Inquiry.find(query)
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    inquiries
  });
});

/**
 * Updates status, notes, or assigned admin user on a booking inquiry.
 */
export const updateInquiryStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const inquiry = await Inquiry.findById(id);

  if (!inquiry) {
    return next(new AppError('No inquiry found with that ID.', 404));
  }

  const { status, notes, assignedTo } = req.body;

  if (status) inquiry.status = status;
  if (notes !== undefined) inquiry.notes = notes;
  if (assignedTo !== undefined) inquiry.assignedTo = assignedTo || null;

  await inquiry.save();

  res.status(200).json({
    success: true,
    inquiry
  });
});

/**
 * Soft deletes a booking inquiry.
 */
export const deleteInquiry = catchAsync(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id);

  if (!inquiry) {
    return next(new AppError('No inquiry found with that ID.', 404));
  }

  inquiry.isDeleted = true;
  inquiry.deletedAt = new Date();
  await inquiry.save();

  res.status(200).json({
    success: true,
    message: 'Booking inquiry soft-deleted successfully.'
  });
});
