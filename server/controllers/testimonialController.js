import Testimonial from '../models/Testimonial.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Public and Admin listing: Returns all active testimonials. Can support pagination/search.
 */
export const getAllTestimonials = catchAsync(async (req, res, next) => {
  const { search, page, limit } = req.query;

  let query = { isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { review: { $regex: search, $options: 'i' } }
    ];
  }

  // If page and limit are specified, return paginated results. Otherwise, return all (for public carousel).
  if (page && limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Testimonial.countDocuments(query);
    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      testimonials
    });
  }

  const testimonials = await Testimonial.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    results: testimonials.length,
    testimonials
  });
});

/**
 * Creates a new testimonial.
 */
export const createTestimonial = catchAsync(async (req, res, next) => {
  const { name, rating, review } = req.body;

  if (!name || !rating || !review) {
    return next(new AppError('Please fill in all required fields (name, rating, review).', 400));
  }

  const newTestimonial = await Testimonial.create({
    name,
    rating: Number(rating),
    review
  });

  res.status(201).json({
    success: true,
    testimonial: newTestimonial
  });
});

/**
 * Updates an existing testimonial.
 */
export const updateTestimonial = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const testimonial = await Testimonial.findById(id);

  if (!testimonial) {
    return next(new AppError('No testimonial found with that ID.', 404));
  }

  const { name, rating, review } = req.body;

  if (name) testimonial.name = name;
  if (rating) testimonial.rating = Number(rating);
  if (review) testimonial.review = review;

  await testimonial.save();

  res.status(200).json({
    success: true,
    testimonial
  });
});

/**
 * Soft deletes a testimonial.
 */
export const deleteTestimonial = catchAsync(async (req, res, next) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return next(new AppError('No testimonial found with that ID.', 404));
  }

  testimonial.isDeleted = true;
  testimonial.deletedAt = new Date();
  await testimonial.save();

  res.status(200).json({
    success: true,
    message: 'Testimonial soft-deleted successfully.'
  });
});
