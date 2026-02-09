const User = require('../../../supplies-backend/Database/models/user.model');
const Order = require('../../../supplies-backend/Database/models/order.model');

exports.exportUserData = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).lean();
        const orders = await Order.find({ user: userId }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user, orders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.requestUserDeletion = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(userId, { deletionRequested: true }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Deletion request received', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
