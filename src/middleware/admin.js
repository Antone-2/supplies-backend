// admin.js - Middleware to check for admin role
module.exports = function (req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
};
