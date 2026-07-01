import express from 'express';
import {
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry
} from '../controllers/inquiryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public endpoint to submit inquiries from website forms
router.post('/', createInquiry);

// Admin protected endpoints
router.use(protect);
router.get('/', getAllInquiries);
router.put('/:id', updateInquiryStatus);
router.delete('/:id', deleteInquiry);

export default router;
