import express from 'express';
import {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getUsers,
    getUserOrders,
    request2FA,
    verify2FA,
    uploadAvatar
} from '../controllers/userController.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import { createReview, getUserReviews, updateReview, deleteReview } from '../controllers/reviewController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer setup for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Admin: GET /api/v1/users - Paginated user listing
router.get('/', jwtAuthMiddleware, getUsers);

// GET /api/v1/users/profile - Get logged-in user profile
router.get('/profile', jwtAuthMiddleware, getProfile);

// PUT /api/v1/users/profile - Update logged-in user profile
router.put('/profile', jwtAuthMiddleware, updateProfile);

// POST /api/v1/users/avatar - Upload avatar image
router.post('/avatar', jwtAuthMiddleware, upload.single('file'), uploadAvatar);

// GET /api/v1/users/orders - Get user orders
router.get('/orders', jwtAuthMiddleware, getUserOrders);

// GET /api/v1/users/addresses - Get user addresses
router.get('/addresses', jwtAuthMiddleware, getAddresses);

// POST /api/v1/users/addresses - Add new address
router.post('/addresses', jwtAuthMiddleware, addAddress);

// PUT /api/v1/users/addresses/:addressId - Update address
router.put('/addresses/:addressId', jwtAuthMiddleware, updateAddress);

// DELETE /api/v1/users/addresses/:addressId - Delete address
router.delete('/addresses/:addressId', jwtAuthMiddleware, deleteAddress);

// Review routes
router.post('/reviews', jwtAuthMiddleware, createReview);
router.get('/reviews', jwtAuthMiddleware, getUserReviews);
router.put('/reviews/:reviewId', jwtAuthMiddleware, updateReview);
router.delete('/reviews/:reviewId', jwtAuthMiddleware, deleteReview);

export default router;
