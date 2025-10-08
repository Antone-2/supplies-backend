import Order from '../Database/models/order.model';
import User from '../Database/models/user.model';
import Product from '../Database/models/product.model';

// Sales summary: total sales, orders, revenue
export async function getSalesSummary(req, res) {
    try {
        const totalOrders = await Order.countDocuments();
        const totalRevenueAgg = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalRevenue = totalRevenueAgg[0]?.total || 0;
        res.json({ totalOrders, totalRevenue });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch sales summary' });
    }
}

// User growth: total users, new users in last 30 days
export async function getUserGrowth(req, res) {
    try {
        const totalUsers = await User.countDocuments();
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const newUsers = await User.countDocuments({ createdAt: { $gte: since } });
        res.json({ totalUsers, newUsersLast30Days: newUsers });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user growth' });
    }
}

// Product performance: top selling products
export async function getTopProducts(req, res) {
    try {
        const topProducts = await Product.find().sort({ numReviews: -1, rating: -1 }).limit(10);
        res.json({ topProducts });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch top products' });
    }
}
