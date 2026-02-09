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


router.get('/', jwtAuthMiddleware, getUsers);


router.get('/profile', jwtAuthMiddleware, getProfile);


router.put('/profile', jwtAuthMiddleware, updateProfile);


router.post('/avatar', jwtAuthMiddleware, upload.single('file'), uploadAvatar);


router.get('/orders', jwtAuthMiddleware, getUserOrders);


router.get('/addresses', jwtAuthMiddleware, getAddresses);


router.post('/addresses', jwtAuthMiddleware, addAddress);


router.put('/addresses/:addressId', jwtAuthMiddleware, updateAddress);


router.delete('/addresses/:addressId', jwtAuthMiddleware, deleteAddress);


router.post('/reviews', jwtAuthMiddleware, createReview);
router.get('/reviews', jwtAuthMiddleware, getUserReviews);
router.put('/reviews/:reviewId', jwtAuthMiddleware, updateReview);
router.delete('/reviews/:reviewId', jwtAuthMiddleware, deleteReview);

export default router;
