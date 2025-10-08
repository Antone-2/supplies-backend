const AdminAudit = require('../../Database/models/adminAudit.model');

// Log an admin action
exports.logAction = async (adminId, action, details = {}) => {
    await AdminAudit.create({ admin: adminId, action, details });
};

// Get audit log (paginated)
exports.getAuditLog = async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AdminAudit.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('admin', 'name email');
    const total = await AdminAudit.countDocuments();
    res.json({ logs, page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) });
};
