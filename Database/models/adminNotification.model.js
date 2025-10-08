const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
    type: { type: String, required: true }, // alert, error, log
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);