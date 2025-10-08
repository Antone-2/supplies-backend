const mongoose = require('mongoose');

const adminRoleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String, required: true }],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdminRole', adminRoleSchema);