const Cart = require('../../../Database/models/cart.model');

// Helper to get user or guest identifier
function getCartOwner(req) {
    if (req.user && req.user.id) {
        return { user: req.user.id };
    } else if (req.body.guestId) {
        return { guestId: req.body.guestId };
    } else if (req.cookies && req.cookies.guestId) {
        return { guestId: req.cookies.guestId };
    }
    return null;
}

exports.getCart = async (req, res) => {
    try {
        const owner = getCartOwner(req);
        if (!owner) return res.json({ items: [] });
        const cart = await Cart.findOne(owner).populate('items.product');
        if (!cart) return res.json({ items: [] });
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch cart' });
    }
};

exports.addToCart = async (req, res) => {
    try {
        console.log('addToCart payload:', req.body);
        const owner = getCartOwner(req);
        if (!owner) return res.status(400).json({ message: 'No user or guest identifier provided' });
        const { productId, quantity } = req.body;
        let cart = await Cart.findOne(owner);
        if (!cart) {
            cart = new Cart({ ...owner, items: [] });
        }
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }
        await cart.save();
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add to cart' });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const owner = getCartOwner(req);
        if (!owner) return res.status(400).json({ message: 'No user or guest identifier provided' });
        const { productId } = req.body;
        const cart = await Cart.findOne(owner);
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove from cart' });
    }
};

exports.updateCart = async (req, res) => {
    try {
        const owner = getCartOwner(req);
        if (!owner) return res.status(400).json({ message: 'No user or guest identifier provided' });
        const { productId, quantity } = req.body;
        const cart = await Cart.findOne(owner);
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
        }
        await cart.save();
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update cart' });
    }
};
