import mongoose from 'mongoose';

const preferredFlavorSchema = new mongoose.Schema({
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

preferredFlavorSchema.index({ 'name.ar': 1 });
preferredFlavorSchema.index({ 'name.en': 1 });
preferredFlavorSchema.index({ isActive: 1, sortOrder: 1 });

export const PreferredFlavorModel = mongoose.model('PreferredFlavor', preferredFlavorSchema);