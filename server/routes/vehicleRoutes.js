import express from 'express';
import {
  getPublicVehicles,
  getVehicleBySlug,
  getAdminVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  reorderVehicles
} from '../controllers/vehicleController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getPublicVehicles);
router.get('/admin', protect, getAdminVehicles); // Admin list endpoint must be above slug parameter
router.get('/:slug', getVehicleBySlug);

// Upload configurations
const vehicleUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]);

// Admin protected write routes
router.use(protect);
router.put('/reorder', reorderVehicles);
router.post('/', vehicleUploadFields, createVehicle);
router.put('/:id', vehicleUploadFields, updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;
