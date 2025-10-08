// Fake authentication for development/testing
function authenticateToken(req, res, next) {
    req.user = { id: 'testuserid', role: 'admin' };
    next();
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
}

module.exports = { authenticateToken, requireAdmin };
