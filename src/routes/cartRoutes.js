// cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../modules/cart/cart.controller');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');

router.get('/', jwtAuthMiddleware, cartController.getCart);
router.post('/add', jwtAuthMiddleware, cartController.addToCart);
router.post('/remove', jwtAuthMiddleware, cartController.removeFromCart);
router.post('/update', jwtAuthMiddleware, cartController.updateCart);

module.exports = router;
