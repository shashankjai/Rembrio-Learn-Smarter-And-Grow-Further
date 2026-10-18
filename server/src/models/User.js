import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    // Incremented on logout / password change to invalidate all issued JWTs.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.checkPassword = async function checkPassword(plain) {
  const doc = this.passwordHash ? this : await User.findById(this._id).select('+passwordHash');
  return bcrypt.compare(plain, doc.passwordHash);
};

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, createdAt: this.createdAt };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
