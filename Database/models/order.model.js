const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true }, // Custom order ID from frontend
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: { type: mongoose.Schema.Types.Mixed }, // Allow both ObjectId and Number
        name: { type: String },
        quantity: { type: Number },
        price: { type: Number }
    }],
    totalAmount: { type: Number },
    shippingAddress: { type: Object },
    shippingFee: { type: Number },
    subtotal: { type: Number },
    paymentMethod: { type: String },
    orderStatus: { type: String, default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    trackingNumber: { type: String },
    transactionStatus: { type: String, default: '' },
    timeline: [{ status: String, changedAt: Date, note: String }],
    activityLog: [{ action: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, message: String, createdAt: Date }],
    createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ user: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
