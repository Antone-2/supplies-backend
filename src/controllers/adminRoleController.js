const AdminRole = require('../../Database/models/adminRole.model');

exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const role = new AdminRole({ name, permissions });
        await role.save();
        res.status(201).json(role);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getRoles = async (req, res) => {
    try {
        const roles = await AdminRole.find();
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;
        const role = await AdminRole.findByIdAndUpdate(id, { name, permissions }, { new: true });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.json(role);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await AdminRole.findByIdAndDelete(id);
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};