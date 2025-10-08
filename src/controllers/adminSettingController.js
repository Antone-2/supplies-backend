const AdminSetting = require('../../Database/models/adminSetting.model');

exports.getSettings = async (req, res) => {
    try {
        const settings = await AdminSetting.find();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const setting = await AdminSetting.findOneAndUpdate(
            { key },
            { value, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json(setting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};