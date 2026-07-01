import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A testimonial must specify the customer name'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'A testimonial must have a rating'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    review: {
      type: String,
      required: [true, 'A testimonial must have a review text'],
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Soft delete filtering middleware
testimonialSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;
