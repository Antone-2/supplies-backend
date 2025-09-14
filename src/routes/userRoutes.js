const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress
} = require('../controllers/userController');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');

// GET /api/v1/users/profile - Get logged-in user profile
router.get('/profile', jwtAuthMiddleware, getProfile);

// PUT /api/v1/users/profile - Update logged-in user profile
router.put('/profile', jwtAuthMiddleware, updateProfile);

// GET /api/v1/users/addresses - Get user addresses
router.get('/addresses', jwtAuthMiddleware, getAddresses);

// POST /api/v1/users/addresses - Add new address
router.post('/addresses', jwtAuthMiddleware, addAddress);

// PUT /api/v1/users/addresses/:addressId - Update address
router.put('/addresses/:addressId', jwtAuthMiddleware, updateAddress);

// DELETE /api/v1/users/addresses/:addressId - Delete address
router.delete('/addresses/:addressId', jwtAuthMiddleware, deleteAddress);

module.exports = router;
