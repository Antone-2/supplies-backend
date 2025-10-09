// cartRoutes.js
import express from 'express';
const router = express.Router();
import cartController from '../modules/cart/cart.controller.js';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';

router.get('/', jwtAuthMiddleware, cartController.getCart);
router.post('/add', jwtAuthMiddleware, cartController.addToCart);
router.post('/remove', jwtAuthMiddleware, cartController.removeFromCart);
router.post('/update', jwtAuthMiddleware, cartController.updateCart);

export default router;
