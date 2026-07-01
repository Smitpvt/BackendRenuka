import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Inquiry must have a customer name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Inquiry must have a contact phone number'],
      trim: true,
    },
    pickup: {
      type: String,
      required: [true, 'Inquiry must have a pickup location'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Inquiry must have a destination location'],
      trim: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Inquiry must specify vehicle preference'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Inquiry must specify travel date'],
    },
    tripType: {
      type: String,
      required: [true, 'Inquiry must specify trip type'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Contacted', 'Completed'],
      default: 'Pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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
inquirySchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;
