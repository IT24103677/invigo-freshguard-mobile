const mongoose = require("mongoose");

const saleAllocationSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    qtyDeducted: {
      type: Number,
      required: true,
      min: 1,
    },
    expiryDateSnapshot: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    unitPriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    discountRateApplied: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    allocations: {
      type: [saleAllocationSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Each sale item must contain at least one batch allocation.",
      },
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    saleGroupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    saleDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    clientRequestKey: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "VOID"],
      default: "ACTIVE",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: null,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: null,
    },
    receiptImageUrl: {
      type: String,
      default: null,
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    amountGiven: {
      type: Number,
      min: 0,
      default: null,
    },
    changeGiven: {
      type: Number,
      min: 0,
      default: null,
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "A sale must contain at least one item.",
      },
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidReason: {
      type: String,
      trim: true,
      default: null,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ recordedBy: 1, saleDateTime: -1 });
saleSchema.index(
  { recordedBy: 1, clientRequestKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      recordedBy: { $exists: true, $type: "objectId" },
      clientRequestKey: { $exists: true, $type: "string" },
    },
  }
);

module.exports = mongoose.model("Sale", saleSchema);
