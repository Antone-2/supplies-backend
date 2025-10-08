const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role: { type: String, default: 'customer' },
    googleId: { type: String },
    avatar: { type: String },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    phone: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOTP: { type: String },
    twoFactorOTPExpires: { type: Date }
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
const User = mongoose.model('User', userSchema);
module.exports = User;
