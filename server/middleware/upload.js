import multer from 'multer';
import AppError from '../utils/appError.js';

// Use memory storage to avoid saving temp files to disk
const multerStorage = multer.memoryStorage();

// Validate file type
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file format. Please upload images only (JPEG, JPG, PNG, WEBP).', 400), false);
  }
};

// Configure Multer
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit to support heavy raw photos directly from phone cameras
  }
});

export default upload;
