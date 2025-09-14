// src/middleware/authMiddleware.js

// Fake authentication for development/testing
function authenticateToken(req, res, next) {
    // In production, verify JWT or session here
    req.user = { id: 'testuserid', role: 'admin' };
    next();
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
}

module.exports = {
    authenticateToken,
    requireAdmin
};
