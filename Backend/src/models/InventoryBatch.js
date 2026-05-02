const mongoose = require('mongoose');
const BATCH_NUMBER_REGEX = /^B\d{3,}$/;

const inventoryBatchSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true,
    unique: true,
    uppercase: true,
    match: [BATCH_NUMBER_REGEX, 'Batch number must follow the format B001 or higher.'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [51, 'Quantity must be greater than 50.'],
  },
  expiryDate: {
    type: String,
    required: [true, 'Expiry date is required'],
    trim: true,
  },
}, { timestamps: true });

inventoryBatchSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
