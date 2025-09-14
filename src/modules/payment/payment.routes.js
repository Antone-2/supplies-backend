const express = require('express');
const router = express.Router();

// Mock payment intent endpoint for testing
router.post('/intent', (req, res) => {
    res.status(200).json({ clientSecret: 'mock_client_secret' });
});

module.exports = router;