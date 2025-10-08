const AdminUser = require('../../Database/models/adminUser.model');

exports.inviteAdmin = async (req, res) => {
    try {
        const { email, name, role, invitedBy } = req.body;
        const existing = await AdminUser.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Admin already exists' });
        const admin = new AdminUser({ email, name, role, invitedBy });
        await admin.save();
        res.status(201).json(admin);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.listAdmins = async (req, res) => {
    try {
        const admins = await AdminUser.find();
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, active } = req.body;
        const admin = await AdminUser.findByIdAndUpdate(id, { name, role, active }, { new: true });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json(admin);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.removeAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await AdminUser.findByIdAndDelete(id);
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json({ message: 'Admin removed' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};