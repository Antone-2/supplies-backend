// returns.controller.js
const Return = require('./returns.model');

// Get all returns
exports.getReturns = async (req, res) => {
    try {
        const returns = await Return.find();
        res.json(returns);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch returns' });
    }
};

// Get a single return by ID
exports.getReturnById = async (req, res) => {
    try {
        const ret = await Return.findById(req.params.id);
        if (!ret) return res.status(404).json({ message: 'Return not found' });
        res.json(ret);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch return' });
    }
};

// Create a new return
exports.createReturn = async (req, res) => {
    try {
        const ret = new Return(req.body);
        await ret.save();
        res.status(201).json(ret);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create return' });
    }
};

// Update a return
exports.updateReturn = async (req, res) => {
    try {
        const ret = await Return.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!ret) return res.status(404).json({ message: 'Return not found' });
        res.json(ret);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update return' });
    }
};

// Delete a return
exports.deleteReturn = async (req, res) => {
    try {
        const ret = await Return.findByIdAndDelete(req.params.id);
        if (!ret) return res.status(404).json({ message: 'Return not found' });
        res.json({ message: 'Return deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete return' });
    }
};