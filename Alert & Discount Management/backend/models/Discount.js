const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: [true, "Product ID is required"],
    },
    productName: {
      type: String,
      default: "",
    },
    batchId: {
      type: Number,
      required: [true, "Batch ID is required"],
    },
    batchNumber: {
      type: String,
      default: "",
    },
    discountPercent: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [90, "Discount cannot exceed 90%"],
      validate: {
        validator: Number.isInteger,
        message: "Discount percent must be a whole number",
      },
    },
    note: {
      type: String,
      default: null,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ["MANUAL", "AI"],
      default: "MANUAL",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for fast lookup by product/batch
discountSchema.index({ productId: 1, batchId: 1 });
discountSchema.index({ active: 1 });

module.exports = mongoose.model("Discount", discountSchema);
