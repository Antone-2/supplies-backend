const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    role: { type: String, required: true },
    invitedBy: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdminUser', adminUserSchema);