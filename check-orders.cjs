const mongoose = require('mongoose');
const Order = require('./Database/models/order.model.js');

async function checkOrders() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medhelm');
        console.log('Connected to MongoDB');

        const orders = await Order.find({}, 'orderNumber paymentStatus transactionStatus totalAmount createdAt').sort({ createdAt: -1 });

        console.log('=== ORDER PAYMENT STATUSES ===');
        orders.forEach(order => {
            console.log(`Order: ${order.orderNumber}, Payment Status: ${order.paymentStatus}, Transaction Status: ${order.transactionStatus}, Amount: ${order.totalAmount}, Created: ${order.createdAt}`);
        });

        const paidOrders = await Order.find({ paymentStatus: 'paid' });
        console.log(`\nTotal paid orders: ${paidOrders.length}`);

        const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        console.log(`Total revenue from paid orders: ${totalRevenue}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrders();
