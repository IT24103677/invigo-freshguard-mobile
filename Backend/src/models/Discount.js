const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      trim: true,
      default: null,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: null,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 90,
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ['MANUAL', 'AI'],
      default: 'MANUAL',
    },
    promotionImageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    promotionImageUpdatedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

discountSchema.index({ batchId: 1, active: 1 });
discountSchema.index({ productId: 1, active: 1 });

discountSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

module.exports = mongoose.model('Discount', discountSchema);
