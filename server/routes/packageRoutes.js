import express from 'express';
import {
  getPublicPackages,
  getPackageBySlug,
  getAdminPackages,
  createPackage,
  updatePackage,
  deletePackage
} from '../controllers/packageController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Upload configurations
const packageUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]);

// Public routes
router.get('/', getPublicPackages);
router.get('/admin', protect, getAdminPackages); // Admin list endpoint must be above slug parameter
router.get('/:slug', getPackageBySlug);

// Admin protected write routes
router.use(protect);
router.post('/', packageUploadFields, createPackage);
router.put('/:id', packageUploadFields, updatePackage);
router.delete('/:id', deletePackage);

export default router;
