const mongoose = require('mongoose');
require('dotenv').config();

async function fetchAnalytics() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('MongoDB connected successfully');

        const Order = mongoose.model('Order', require('./Database/models/order.model.js').schema);
        const User = mongoose.model('User', require('./Database/models/user.model.js').schema);
        const Product = mongoose.model('Product', require('./Database/models/product.model.js').schema);

        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
        const totalRevenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments({ isActive: true });
        const lowStockProducts = await Product.countDocuments({ isActive: true, countInStock: { $lt: 10 } });

        console.log('\n=== REAL DATABASE ANALYTICS ===');
        console.log('totalOrders:', totalOrders);
        console.log('pendingOrders:', pendingOrders);
        console.log('totalRevenue:', totalRevenue);
        console.log('totalUsers:', totalUsers);
        console.log('totalProducts:', totalProducts);
        console.log('lowStockProducts:', lowStockProducts);

        // Additional analytics
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthResult = await Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: monthStart, $lte: monthEnd } } },
                { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }
            ]);

            monthlyRevenue.push({
                month: monthStart.toLocaleString('default', { month: 'short' }),
                revenue: monthResult.length > 0 ? monthResult[0].revenue : 0,
                orders: monthResult.length > 0 ? monthResult[0].orders : 0
            });
        }

        console.log('\nMonthly Revenue (last 6 months):');
        monthlyRevenue.forEach(month => {
            console.log(`${month.month}: KES ${month.revenue} (${month.orders} orders)`);
        });

        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');

    } catch (error) {
        console.error('Error fetching analytics:', error.message);
        process.exit(1);
    }
}

fetchAnalytics();
