import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const vehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A vehicle must have a name'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    image: {
      type: String,
      required: [true, 'A vehicle must have an image'],
    },
    seats: {
      type: Number,
      required: [true, 'A vehicle must specify seating capacity'],
    },
    type: {
      type: String,
      required: [true, 'A vehicle must have a type'],
      enum: ['SUV / Cars', 'Mini Bus', 'Luxury Bus'],
    },
    ac: {
      type: Boolean,
      default: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    fuelType: {
      type: String,
      required: [true, 'A vehicle must specify fuel type'],
      enum: ['Diesel', 'Petrol', 'CNG', 'Electric'],
    },
    gallery: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    specifications: {
      capacity: { type: String, default: "" },
      luggage: { type: String, default: "" },
      engine: { type: String, default: "" },
      comfort: { type: String, default: "" },
      airConditioning: { type: String, default: "" },
    },
    cabinDescription: {
      type: String,
      default: '',
    },
    pricing: {
      type: {
        type: String,
        enum: ['per_km', 'custom'],
        default: 'per_km',
      },
      ac: {
        type: Number,
        default: 0,
      },
      nonAc: {
        type: Number,
        default: 0,
      },
      label: {
        type: String,
        default: 'Per KM',
      },
      description: {
        type: String,
        default: '',
      },
      permit: {
        type: Number,
        default: 0,
      },
      driverAllowance: {
        type: Number,
        default: 0,
      },
      tollIncluded: {
        type: Boolean,
        default: false,
      },
      parkingIncluded: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ['Available', 'Booked', 'Maintenance'],
      default: 'Available',
    },
    active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      required: [true, 'A vehicle must have a description'],
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for computed frontend display category
vehicleSchema.virtual('displayCategory').get(function () {
  if (this.type === 'SUV / Cars') {
    return 'Car (6/7 Seater)';
  }
  return this.type;
});

// Auto slug generation
vehicleSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    const baseSlug = slugify(this.name);
    let uniqueSlug = baseSlug;
    let count = 0;
    const Model = this.constructor;

    let slugExists = await Model.findOne({ slug: uniqueSlug, _id: { $ne: this._id } });
    while (slugExists) {
      count++;
      uniqueSlug = `${baseSlug}-${count}`;
      slugExists = await Model.findOne({ slug: uniqueSlug, _id: { $ne: this._id } });
    }

    this.slug = uniqueSlug;
  }
  next();
});

// Soft delete filtering middleware
vehicleSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
