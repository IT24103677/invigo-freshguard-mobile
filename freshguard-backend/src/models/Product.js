const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: null,
    },
    barcode: {
      type: String,
      trim: true,
      default: null,
    },
    brand: {
      type: String,
      trim: true,
      default: null,
    },
    supplier: {
      type: String,
      trim: true,
      default: null,
    },
    unitType: {
      type: String,
      required: true,
      trim: true,
    },
    buyingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: "text", category: "text" });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Product", productSchema);
