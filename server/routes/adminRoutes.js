import express from 'express';
import { getAllAdmins, createAdmin, deleteAdmin } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Secure admin management routes to Super Admins only
router.use(protect);
router.use(restrictTo('superadmin'));

router.route('/')
  .get(getAllAdmins)
  .post(createAdmin);

router.route('/:id')
  .delete(deleteAdmin);

export default router;
