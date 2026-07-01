import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A package must have a title'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'A package must have a category'],
      enum: ['Weekend Trips', 'Pilgrimage', 'Family Tours', 'Corporate Tours'],
    },
    duration: {
      type: String,
      required: [true, 'A package must have a duration'],
    },
    desc: {
      type: String,
      required: [true, 'A package must have a description'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'A package must have a main image'],
    },
    gallery: [
      {
        image: {
          type: String,
          required: true,
          trim: true,
        },
        title: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    pricing: {
      ac: {
        type: Number,
        required: function () {
          return !this.pricing || !this.pricing.customQuote;
        },
      },
      nonAc: {
        type: Number,
      },
      tollIncluded: {
        type: Boolean,
        default: false,
      },
      customQuote: {
        type: Boolean,
        default: false,
      },
    },
    highlights: {
      type: [String],
      default: [],
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

// Pre-init hook to parse raw string gallery values to objects for backward compatibility
packageSchema.pre('init', function (rawDoc) {
  if (rawDoc && Array.isArray(rawDoc.gallery)) {
    rawDoc.gallery = rawDoc.gallery.map((item) => {
      if (typeof item === 'string') {
        return { image: item, title: '' };
      }
      return item;
    });
  }
});

// Auto-slug generation before save
packageSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = slugify(this.title);
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
packageSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Package = mongoose.model('Package', packageSchema);

export default Package;
