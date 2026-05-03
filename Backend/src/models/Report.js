const mongoose = require('mongoose');

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reportTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    reportType: {
      type: String,
      required: true,
      enum: ['INVENTORY', 'EXPIRED', 'NEAR_EXPIRY', 'SALES', 'LOW_STOCK', 'DISCOUNT_USAGE'],
    },
    visibility: {
      type: String,
      enum: ['ADMIN', 'ALL'],
      default: 'ADMIN',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: '',
    },
    // Computed snapshot stored at generation time
    summary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // File attachment (any document/image uploaded by admin)
    attachmentFileId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    attachmentFilename: {
      type: String,
      default: '',
    },
    attachmentContentType: {
      type: String,
      default: '',
    },
    attachmentOriginalName: {
      type: String,
      default: '',
    },
    attachmentUpdatedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ reportType: 1, createdAt: -1 });
reportSchema.index({ visibility: 1, isActive: 1 });

reportSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

module.exports = mongoose.model('Report', reportSchema);
