const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: Object },
    createdAt: { type: Date, default: Date.now }
});

adminAuditSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
