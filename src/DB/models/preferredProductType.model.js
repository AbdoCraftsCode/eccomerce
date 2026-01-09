// models/preferredProductType.model.js
import mongoose from 'mongoose';

const preferredProductTypeSchema = new mongoose.Schema({
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
  icon: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['food', 'beverage', 'snack', 'other'],
    default: 'other'
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

preferredProductTypeSchema.index({ 'name.ar': 1 });
preferredProductTypeSchema.index({ 'name.en': 1 });
preferredProductTypeSchema.index({ isActive: 1, sortOrder: 1, category: 1 });

export const PreferredProductTypeModel = mongoose.model('PreferredProductType', preferredProductTypeSchema);