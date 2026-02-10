const Order = require('../Database/models/order.model');
const User = require('../Database/models/user.model');
const Product = require('../Database/models/product.model');


exports.getSummary = async (req, res) => {
    try {
        const [totalOrders, totalProducts, totalUsers] = await Promise.all([
            Order.countDocuments(),
            Product.countDocuments(),
            User.countDocuments()
        ]);

        res.json({
            totalOrders,
            totalProducts,
            totalUsers
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
};


exports.getRevenueByPeriod = async (req, res) => {
    const { start, end } = req.query;
    const match = {};
    if (start) match.createdAt = { $gte: new Date(start) };
    if (end) match.createdAt = { ...(match.createdAt || {}), $lte: new Date(end) };
    const agg = await Order.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    res.json({ revenue: agg[0]?.total || 0 });
};


exports.getTopCustomers = async (req, res) => {
    const agg = await Order.aggregate([
        { $group: { _id: '$user', totalSpent: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
    ]);
    res.json({ topCustomers: agg });
};


exports.getInventoryAlerts = async (req, res) => {
    const lowStock = await Product.find({ countInStock: { $lt: 10 } });
    res.json({ lowStock });
};
