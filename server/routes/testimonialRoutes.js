import express from 'express';
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} from '../controllers/testimonialController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route (used by front-end testimonial slider and admin listing)
router.get('/', getAllTestimonials);

// Admin protected write routes
router.use(protect);
router.post('/', createTestimonial);
router.put('/:id', updateTestimonial);
router.delete('/:id', deleteTestimonial);

export default router;
