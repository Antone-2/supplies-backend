import Setting from '../../../Database/models/setting.model.js';

export const getSettings = async (req, res) => {
    try {
        const settings = await Setting.find({});
        const settingsMap = {};
        settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });
        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }

        const setting = await Setting.findOneAndUpdate(
            { key },
            { value, updatedAt: new Date() },
            { new: true, upsert: true }
        );

        res.json({ message: 'Setting updated successfully', setting });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
};