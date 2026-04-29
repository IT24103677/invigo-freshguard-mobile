const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Dry Goods', 'Frozen', 'Other'],
    default: 'Produce',
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deliveryDays: { type: Number, min: 0, default: null },
  rating: { type: Number, min: 0, max: 5, default: null },
  productsSupplied: { type: Number, min: 0, default: 0 },
  lastOrderDate: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

supplierSchema.pre('validate', function normalizeFields(next) {
  this.status = String(this.status || '').trim().toLowerCase() === 'active' ? 'Active' : 'Inactive';
  if (!this.name) this.name = this.supplierName;
  next();
});

supplierSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

module.exports = mongoose.model('Supplier', supplierSchema);
