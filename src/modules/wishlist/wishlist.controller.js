const wishlistController = {
    getUserWishlist: (req, res) => {
        res.json({ wishlist: [] });
    },
    addToWishlist: (req, res) => {
        res.json({ message: 'Added to wishlist' });
    },
    removeFromWishlist: (req, res) => {
        res.json({ message: 'Removed from wishlist' });
    }
};

module.exports = wishlistController;
