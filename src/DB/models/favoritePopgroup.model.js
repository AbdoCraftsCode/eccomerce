// models/favoritePopgroup.model.js
import mongoose from 'mongoose';

const favoritePopgroupSchema = new mongoose.Schema({
  name: {
    ar: {
      type: String,
      required: true,
      trim: true
    },
    en: {
      type: String,
      required: true,
      trim: true
    }
  },
  description: {
    ar: {
      type: String,
      trim: true
    },
    en: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  image: {
    url: String,
    public_id: String
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

favoritePopgroupSchema.index({ 'name.ar': 1 });
favoritePopgroupSchema.index({ 'name.en': 1 });
favoritePopgroupSchema.index({ isActive: 1, sortOrder: 1 });

export const FavoritePopgroupModel = mongoose.model('FavoritePopgroup', favoritePopgroupSchema);