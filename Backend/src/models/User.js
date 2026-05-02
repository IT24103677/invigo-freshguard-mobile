const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true, minlength: 8, select: false },
  name: { type: String, required: true, trim: true },
  doj: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
  profileImageFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  profileImageFilename: { type: String, trim: true, default: '' },
  profileImageContentType: { type: String, trim: true, default: '' },
  profileImageUpdatedAt: { type: Date, default: null },
  accountLocked: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lastLoginAt: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
  },
});

module.exports = mongoose.model('User', userSchema);
