import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
    type: { type: String, required: true },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Virtual for status
export default mongoose.model('AdminNotification', adminNotificationSchema);