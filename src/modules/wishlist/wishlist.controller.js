import Wishlist from '../../../Database/models/wishlist.model.js';
import Product from '../../../Database/models/product.model.js';

const wishlistController = {
    getUserWishlist: async (req, res) => {
        try {
            const userId = req.user.id;

            const wishlistItems = await Wishlist.find({ user: userId })
                .populate('product')
                .sort({ createdAt: -1 });


            const validWishlistItems = wishlistItems.filter(item => item.product);

            const wishlist = validWishlistItems.map(item => item.product);

            res.json({
                success: true,
                wishlist: wishlist,
                count: wishlist.length
            });
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch wishlist'
            });
        }
    },

    addToWishlist: async (req, res) => {
        try {
            const userId = req.user.id;
            const { productId } = req.body;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }


            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }


            const existingItem = await Wishlist.findOne({
                user: userId,
                product: productId
            });

            if (existingItem) {
                return res.status(409).json({
                    success: false,
                    message: 'Product already in wishlist'
                });
            }


            const wishlistItem = new Wishlist({
                user: userId,
                product: productId
            });

            await wishlistItem.save();

            res.json({
                success: true,
                message: 'Product added to wishlist',
                wishlistItem: {
                    id: wishlistItem._id,
                    product: product
                }
            });
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add product to wishlist'
            });
        }
    },

    removeFromWishlist: async (req, res) => {
        try {
            const userId = req.user.id;
            const { productId } = req.body;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }

            const result = await Wishlist.findOneAndDelete({
                user: userId,
                product: productId
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found in wishlist'
                });
            }

            res.json({
                success: true,
                message: 'Product removed from wishlist'
            });
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove product from wishlist'
            });
        }
    }
};

export default wishlistController;