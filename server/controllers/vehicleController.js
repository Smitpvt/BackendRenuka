import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { uploadSingleImage } from '../utils/cloudinaryHelper.js';

function normalizeGallery(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [value];
    }
  }
  return [value];
}

/**
 * Public catalog listing: Returns only ACTIVE and NON-DELETED vehicles.
 */
export const getPublicVehicles = catchAsync(async (req, res, next) => {
  const vehicles = await Vehicle.find({ active: true, isDeleted: { $ne: true } })
    .sort({ type: 1, displayOrder: 1 });

  res.status(200).json({
    success: true,
    results: vehicles.length,
    vehicles
  });
});

/**
 * Public single vehicle details fetch by slug.
 */
export const getVehicleBySlug = catchAsync(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({ slug: req.params.slug, active: true, isDeleted: { $ne: true } });

  if (!vehicle) {
    return next(new AppError('No vehicle found with that slug or it is inactive.', 404));
  }

  res.status(200).json({
    success: true,
    vehicle
  });
});

/**
 * Admin management listing: Returns all NON-DELETED fleet members with pagination and search.
 */
export const getAdminVehicles = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 10 } = req.query;

  let query = { isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
      { fuelType: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Vehicle.countDocuments(query);
  const vehicles = await Vehicle.find(query)
    .sort({ type: 1, displayOrder: 1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    vehicles
  });
});

/**
 * Creates a new vehicle.
 */
export const createVehicle = catchAsync(async (req, res, next) => {
  const {
    name,
    seats,
    type,
    ac,
    registrationNumber,
    fuelType,
    status,
    active,
    description,
    cabinDescription,
    specifications,
    amenities,
    pricing
  } = req.body;

  // Validate main image upload
  if (!req.files || !req.files.image) {
    return next(new AppError('Please upload a main cover image for the vehicle.', 400));
  }

  // Upload main cover image to Cloudinary
  let imageUrl;
  try {
    imageUrl = await uploadSingleImage(req.files.image[0].buffer, 'renuka-tours/vehicles');
  } catch (err) {
    return next(new AppError(`Vehicle Cover Image Upload Failed: ${err.message}`, 500));
  }

  // Upload gallery images to Cloudinary
  let galleryUrls = [];
  if (req.files.gallery && req.files.gallery.length > 0) {
    try {
      galleryUrls = await Promise.all(
        req.files.gallery.map(file => uploadSingleImage(file.buffer, 'renuka-tours/vehicles'))
      );
    } catch (err) {
      return next(new AppError(`Gallery Images Upload Failed: ${err.message}`, 500));
    }
  }

  let parsedSpecs = {};
  if (specifications) {
    try {
      parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
    } catch (e) {
      console.error('Error parsing specifications:', e);
    }
  }

  let parsedAmenities = [];
  if (amenities) {
    try {
      parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
    } catch (e) {
      console.error('Error parsing amenities:', e);
    }
  }

  let parsedPricing = {};
  if (pricing) {
    try {
      parsedPricing = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
    } catch (e) {
      console.error('Error parsing pricing:', e);
    }
  }

  // Get next displayOrder in category
  const maxVehicle = await Vehicle.findOne({
    type,
    isDeleted: { $ne: true }
  })
    .sort({ displayOrder: -1 })
    .select('displayOrder')
    .lean();

  const nextDisplayOrder = maxVehicle ? (maxVehicle.displayOrder || 0) + 1 : 0;

  const newVehicle = await Vehicle.create({
    name,
    seats: Number(seats),
    type,
    ac: ac === 'true' || ac === true,
    registrationNumber: registrationNumber || '',
    fuelType,
    status: status || 'Available',
    active: active !== 'false' && active !== false,
    description,
    cabinDescription: cabinDescription || '',
    specifications: parsedSpecs,
    amenities: parsedAmenities,
    pricing: parsedPricing,
    image: imageUrl,
    gallery: galleryUrls,
    displayOrder: nextDisplayOrder
  });

  res.status(201).json({
    success: true,
    vehicle: newVehicle
  });
});

/**
 * Updates an existing vehicle.
 */
export const updateVehicle = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const vehicle = await Vehicle.findById(id);

  if (!vehicle) {
    return next(new AppError('No vehicle found with that ID.', 404));
  }

  const {
    name,
    seats,
    type,
    ac,
    registrationNumber,
    fuelType,
    status,
    active,
    description,
    existingGallery,
    cabinDescription,
    specifications,
    amenities,
    pricing
  } = req.body;

  console.log('[DEBUG CONTROLLER] raw existingGallery type in updateVehicle:', typeof existingGallery, 'value:', existingGallery);

  // Cover image upload if a new file is attached
  let imageUrl = vehicle.image;
  if (req.files && req.files.image && req.files.image.length > 0) {
    try {
      imageUrl = await uploadSingleImage(req.files.image[0].buffer, 'renuka-tours/vehicles');
    } catch (err) {
      return next(new AppError(`Vehicle Cover Image Upload Failed: ${err.message}`, 500));
    }
  } else if (req.body.image) {
    imageUrl = req.body.image;
  }

  // Parse existing gallery images to keep using the helper
  let keptGallery = [];
  if (existingGallery) {
    keptGallery = normalizeGallery(existingGallery);
  } else {
    // If not supplied, keep everything
    keptGallery = normalizeGallery(vehicle.gallery);
  }
  console.log('[DEBUG CONTROLLER] normalized keptGallery type in updateVehicle:', Array.isArray(keptGallery) ? 'array' : typeof keptGallery, 'value:', keptGallery);

  // Upload new gallery images
  let newGalleryUrls = [];
  if (req.files && req.files.gallery && req.files.gallery.length > 0) {
    try {
      newGalleryUrls = await Promise.all(
        req.files.gallery.map(file => uploadSingleImage(file.buffer, 'renuka-tours/vehicles'))
      );
    } catch (err) {
      return next(new AppError(`Gallery Images Upload Failed: ${err.message}`, 500));
    }
  }

  const finalGallery = [...keptGallery, ...newGalleryUrls];

  let parsedSpecs = {};
  if (specifications) {
    try {
      parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
    } catch (e) {
      console.error('Error parsing specifications:', e);
    }
  }

  let parsedAmenities = [];
  if (amenities) {
    try {
      parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
    } catch (e) {
      console.error('Error parsing amenities:', e);
    }
  }

  let parsedPricing = {};
  if (pricing) {
    try {
      parsedPricing = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
    } catch (e) {
      console.error('Error parsing pricing:', e);
    }
  }

  // Update properties
  if (name) vehicle.name = name;
  if (seats) vehicle.seats = Number(seats);
  if (type) vehicle.type = type;
  if (ac !== undefined) vehicle.ac = ac === 'true' || ac === true;
  if (registrationNumber !== undefined) vehicle.registrationNumber = registrationNumber;
  if (fuelType) vehicle.fuelType = fuelType;
  if (status) vehicle.status = status;
  if (active !== undefined) vehicle.active = active === 'true' || active === true;
  if (description) vehicle.description = description;
  if (cabinDescription !== undefined) vehicle.cabinDescription = cabinDescription;
  if (specifications !== undefined) vehicle.specifications = parsedSpecs;
  if (amenities !== undefined) vehicle.amenities = parsedAmenities;
  if (pricing !== undefined) vehicle.pricing = parsedPricing;
  vehicle.image = imageUrl;
  vehicle.gallery = finalGallery;

  await vehicle.save();

  res.status(200).json({
    success: true,
    vehicle
  });
});

/**
 * Soft deletes a vehicle.
 */
export const deleteVehicle = catchAsync(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return next(new AppError('No vehicle found with that ID.', 404));
  }

  vehicle.isDeleted = true;
  vehicle.deletedAt = new Date();
  await vehicle.save();

  res.status(200).json({
    success: true,
    message: 'Vehicle soft-deleted successfully.'
  });
});

/**
 * Reorder vehicles manually using bulkWrite.
 */
export const reorderVehicles = catchAsync(async (req, res, next) => {
  const updates = req.body;

  // 1. Validate: request body is an array
  if (!Array.isArray(updates)) {
    return next(new AppError('Request body must be an array of vehicle updates.', 400));
  }

  // 2. Validate: every object contains _id and numeric displayOrder, and check duplicate IDs
  const seenIds = new Set();
  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    
    if (typeof item !== 'object' || item === null) {
      return next(new AppError(`Item at index ${i} must be an object.`, 400));
    }

    const { _id, displayOrder } = item;

    if (!_id) {
      return next(new AppError(`Item at index ${i} is missing the '_id' field.`, 400));
    }

    if (displayOrder === undefined || displayOrder === null || typeof displayOrder !== 'number' || isNaN(displayOrder)) {
      return next(new AppError(`Item at index ${i} must contain a numeric 'displayOrder'.`, 400));
    }

    if (seenIds.has(_id.toString())) {
      return next(new AppError(`Duplicate vehicle ID detected: ${_id}`, 400));
    }
    seenIds.add(_id.toString());
  }

  // 3. Validate: check if all IDs exist in the database and are valid ObjectIds
  const { Types } = mongoose;
  for (const id of seenIds) {
    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid vehicle ID format: ${id}`, 400));
    }
  }

  const existingVehiclesCount = await Vehicle.countDocuments({
    _id: { $in: Array.from(seenIds) },
    isDeleted: { $ne: true }
  });

  if (existingVehiclesCount !== seenIds.size) {
    return next(new AppError('One or more vehicle IDs are invalid or do not exist.', 400));
  }

  // 4. Database update: build bulkWrite operations updating ONLY displayOrder
  const bulkOps = updates.map(item => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { displayOrder: item.displayOrder } }
    }
  }));

  await Vehicle.bulkWrite(bulkOps);

  // 5. Response matching project's style
  res.status(200).json({
    success: true,
    message: 'Vehicle order updated successfully.'
  });
});
