const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  reason: { type: String, trim: true, default: '' },
  ipAddress: { type: String, trim: true, default: '' },
  userAgent: { type: String, trim: true, default: '' },
  loginTime: { type: Date, default: Date.now },
}, { timestamps: true });

loginHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.loginTime = ret.loginTime ? new Date(ret.loginTime).toISOString().slice(0, 16).replace('T', ' ') : '';
    delete ret._id;
  },
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
