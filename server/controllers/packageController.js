import Package from '../models/Package.js';
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
 * Public catalog listing: Returns only ACTIVE and NON-DELETED packages.
 */
export const getPublicPackages = catchAsync(async (req, res, next) => {
  const packages = await Package.find({ active: true, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    results: packages.length,
    packages
  });
});

/**
 * Public single package details fetch by slug.
 */
export const getPackageBySlug = catchAsync(async (req, res, next) => {
  const pkg = await Package.findOne({ slug: req.params.slug, active: true, isDeleted: { $ne: true } });

  if (!pkg) {
    return next(new AppError('No package found with that slug or it is inactive.', 404));
  }

  res.status(200).json({
    success: true,
    package: pkg
  });
});

/**
 * Admin management listing: Returns all NON-DELETED packages with pagination and search.
 */
export const getAdminPackages = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 10 } = req.query;

  let query = { isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { desc: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Package.countDocuments(query);
  const packages = await Package.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    packages
  });
});

/**
 * Creates a new package.
 */
export const createPackage = catchAsync(async (req, res, next) => {
  // Parse fields
  const {
    title,
    category,
    duration,
    desc,
    featured,
    active,
    pricing,
    highlights
  } = req.body;

  // Manual parsing for pricing object since it might come as form-data string or JSON object
  let parsedPricing = {};
  if (typeof pricing === 'string') {
    try {
      parsedPricing = JSON.parse(pricing);
    } catch (e) {
      return next(new AppError('Pricing field must be a valid JSON string.', 400));
    }
  } else {
    parsedPricing = pricing || {};
  }

  // Parse highlights
  let parsedHighlights = [];
  if (highlights) {
    if (typeof highlights === 'string') {
      try {
        parsedHighlights = JSON.parse(highlights);
      } catch (e) {
        // Fallback split by comma or line breaks if it is plain text
        parsedHighlights = highlights.split('\n').map(h => h.trim()).filter(Boolean);
      }
    } else if (Array.isArray(highlights)) {
      parsedHighlights = highlights;
    }
  }

  // Image Upload Handling
  if (!req.files || !req.files.image) {
    return next(new AppError('Please upload a main package image.', 400));
  }

  // Upload main image
  let imageUrl;
  try {
    imageUrl = await uploadSingleImage(req.files.image[0].buffer, 'renuka-tours/packages');
  } catch (err) {
    return next(new AppError(`Main Image Upload to Cloudinary Failed: ${err.message}`, 500));
  }

  // Upload gallery images
  let galleryUrls = [];
  if (req.files.gallery && req.files.gallery.length > 0) {
    try {
      galleryUrls = await Promise.all(
        req.files.gallery.map(file => uploadSingleImage(file.buffer, 'renuka-tours/packages'))
      );
    } catch (err) {
      return next(new AppError(`Gallery Images Upload to Cloudinary Failed: ${err.message}`, 500));
    }
  }

  // Map gallery images and titles based on galleryStructure
  const { galleryStructure } = req.body;
  console.log('[DEBUG CONTROLLER] Received galleryStructure in createPackage:', galleryStructure);
  let finalGallery = [];
  if (galleryStructure) {
    let parsedStructure = [];
    try {
      parsedStructure = JSON.parse(galleryStructure);
    } catch (e) {
      return next(new AppError('Gallery structure field must be a valid JSON string.', 400));
    }

    finalGallery = parsedStructure.map(item => {
      if (item.fileIndex !== undefined) {
        return {
          image: galleryUrls[item.fileIndex],
          title: item.title ? item.title.trim() : ''
        };
      }
      return {
        image: item.image,
        title: item.title ? item.title.trim() : ''
      };
    });
  } else {
    finalGallery = galleryUrls.map(url => ({ image: url, title: '' }));
  }

  console.log('[DEBUG CONTROLLER] finalGallery reconstructed in createPackage:', JSON.stringify(finalGallery, null, 2));

  // Save to DB
  const newPackage = await Package.create({
    title,
    category,
    duration,
    desc,
    image: imageUrl,
    gallery: finalGallery,
    featured: featured === 'true' || featured === true,
    active: active !== 'false' && active !== false,
    pricing: {
      ac: parsedPricing.ac ? Number(parsedPricing.ac) : undefined,
      nonAc: parsedPricing.nonAc ? Number(parsedPricing.nonAc) : undefined,
      tollIncluded: parsedPricing.tollIncluded === 'true' || parsedPricing.tollIncluded === true,
      customQuote: parsedPricing.customQuote === 'true' || parsedPricing.customQuote === true
    },
    highlights: parsedHighlights
  });

  res.status(201).json({
    success: true,
    package: newPackage
  });
});

/**
 * Updates an existing package.
 */
export const updatePackage = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const pkg = await Package.findById(id);

  if (!pkg) {
    return next(new AppError('No package found with that ID.', 404));
  }

  const {
    title,
    category,
    duration,
    desc,
    featured,
    active,
    pricing,
    highlights,
    existingGallery,
    galleryStructure
  } = req.body;

  // Diagnostic logs to trace exact type and payload content
  console.log('[DEBUG CONTROLLER] raw existingGallery type:', typeof existingGallery, 'value:', existingGallery);
  console.log('[DEBUG CONTROLLER] raw galleryStructure type:', typeof galleryStructure, 'value:', galleryStructure);

  // Parse pricing
  let parsedPricing = {};
  if (pricing) {
    if (typeof pricing === 'string') {
      try {
        parsedPricing = JSON.parse(pricing);
      } catch (e) {
        return next(new AppError('Pricing field must be a valid JSON string.', 400));
      }
    } else {
      parsedPricing = pricing;
    }
  }

  // Parse highlights
  let parsedHighlights;
  if (highlights) {
    if (typeof highlights === 'string') {
      try {
        parsedHighlights = JSON.parse(highlights);
      } catch (e) {
        parsedHighlights = highlights.split('\n').map(h => h.trim()).filter(Boolean);
      }
    } else if (Array.isArray(highlights)) {
      parsedHighlights = highlights;
    }
  }

  // Main Image Upload if provided
  let imageUrl = pkg.image;
  if (req.files && req.files.image && req.files.image.length > 0) {
    try {
      imageUrl = await uploadSingleImage(req.files.image[0].buffer, 'renuka-tours/packages');
    } catch (err) {
      return next(new AppError(`Main Image Upload to Cloudinary Failed: ${err.message}`, 500));
    }
  }

  // Parse existing gallery images using the helper
  let keptGallery = [];
  if (existingGallery) {
    keptGallery = normalizeGallery(existingGallery);
  } else {
    // If not supplied, keep everything from the database
    keptGallery = normalizeGallery(pkg.gallery);
  }
  console.log('[DEBUG CONTROLLER] normalized keptGallery type:', Array.isArray(keptGallery) ? 'array' : typeof keptGallery, 'value:', keptGallery);

  // Upload new gallery images
  let newGalleryUrls = [];
  if (req.files && req.files.gallery && req.files.gallery.length > 0) {
    try {
      newGalleryUrls = await Promise.all(
        req.files.gallery.map(file => uploadSingleImage(file.buffer, 'renuka-tours/packages'))
      );
    } catch (err) {
      return next(new AppError(`Gallery Images Upload to Cloudinary Failed: ${err.message}`, 500));
    }
  }

  // Merge/rebuild gallery structure
  console.log('[DEBUG CONTROLLER] Received galleryStructure in updatePackage:', galleryStructure);
  let finalGallery = [];

  if (galleryStructure) {
    let parsedStructure = [];
    try {
      parsedStructure = JSON.parse(galleryStructure);
    } catch (e) {
      return next(new AppError('Gallery structure field must be a valid JSON string.', 400));
    }

    finalGallery = parsedStructure.map(item => {
      if (item.fileIndex !== undefined) {
        return {
          image: newGalleryUrls[item.fileIndex],
          title: item.title ? item.title.trim() : ''
        };
      }
      return {
        image: item.image,
        title: item.title ? item.title.trim() : ''
      };
    });
  } else {
    // Backward compatibility fallback: normalize whatever is in keptGallery and newGalleryUrls to objects
    const normalizedKept = keptGallery.map(item => {
      if (typeof item === 'object' && item !== null) {
        return { image: item.image, title: item.title || '' };
      }
      return { image: item, title: '' };
    });
    const normalizedNew = newGalleryUrls.map(url => ({ image: url, title: '' }));
    finalGallery = [...normalizedKept, ...normalizedNew];
  }

  console.log('[DEBUG CONTROLLER] finalGallery reconstructed in updatePackage:', JSON.stringify(finalGallery, null, 2));

  // Update properties
  if (title) pkg.title = title;
  if (category) pkg.category = category;
  if (duration) pkg.duration = duration;
  if (desc) pkg.desc = desc;
  if (featured !== undefined) pkg.featured = featured === 'true' || featured === true;
  if (active !== undefined) pkg.active = active === 'true' || active === true;
  pkg.image = imageUrl;
  pkg.gallery = finalGallery;
  pkg.markModified('gallery');
  if (parsedHighlights) pkg.highlights = parsedHighlights;

  if (pricing) {
    pkg.pricing = {
      ac: parsedPricing.ac ? Number(parsedPricing.ac) : undefined,
      nonAc: parsedPricing.nonAc ? Number(parsedPricing.nonAc) : undefined,
      tollIncluded: parsedPricing.tollIncluded === 'true' || parsedPricing.tollIncluded === true,
      customQuote: parsedPricing.customQuote === 'true' || parsedPricing.customQuote === true
    };
  }

  await pkg.save();

  res.status(200).json({
    success: true,
    package: pkg
  });
});

/**
 * Soft deletes a package.
 */
export const deletePackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findById(req.params.id);

  if (!pkg) {
    return next(new AppError('No package found with that ID.', 404));
  }

  pkg.isDeleted = true;
  pkg.deletedAt = new Date();
  await pkg.save();

  res.status(200).json({
    success: true,
    message: 'Package soft-deleted successfully.'
  });
});
