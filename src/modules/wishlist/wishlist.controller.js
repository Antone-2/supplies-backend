const Product = require('../../../Database/models/product.model');
const Wishlist = require('../../../Database/models/wishlist.model');

// Get current user's wishlist
exports.getUserWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
        if (!wishlist) return res.json({ items: [] });
        res.json({ items: wishlist.products });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
};

// Add product to current user's wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, products: [productId] });
        } else if (!wishlist.products.map(id => id.toString()).includes(productId)) {
            wishlist.products.push(productId);
        }
        await wishlist.save();
        await wishlist.populate('products');
        res.json({ items: wishlist.products });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add to wishlist' });
    }
};

// Remove product from current user's wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();
        await wishlist.populate('products');
        res.json({ items: wishlist.products });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove from wishlist' });
    }
};

// Get all wishlists
exports.getWishlists = async (req, res) => {
    try {
        const wishlists = await Wishlist.find();
        res.json(wishlists);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch wishlists' });
    }
};

// Get a single wishlist by ID
exports.getWishlistById = async (req, res) => {
    try {
        const wishlist = await Wishlist.findById(req.params.id);
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        res.json(wishlist);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
};

// Create a new wishlist
exports.createWishlist = async (req, res) => {
    try {
        const wishlist = new Wishlist(req.body);
        await wishlist.save();
        res.status(201).json(wishlist);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create wishlist' });
    }
};

// Update a wishlist
exports.updateWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        res.json(wishlist);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update wishlist' });
    }
};

// Delete a wishlist
exports.deleteWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findByIdAndDelete(req.params.id);
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        res.json({ message: 'Wishlist deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete wishlist' });
    }
};