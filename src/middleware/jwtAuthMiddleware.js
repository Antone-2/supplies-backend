import jwt from 'jsonwebtoken';
import User from '../../Database/models/user.model.js';
import config from '../../config/environment.js';

const jwtAuthMiddleware = async (req, res, next) => {
    // Check for token in multiple places for cross-domain compatibility
    let token = req.cookies.token;

    // If no cookie token, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // If still no token, check for token in request body (for guest checkout)
    if (!token && req.body && req.body.token) {
        token = req.body.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Authorization token missing' });
    }

    try {
        const decoded = jwt.verify(token, config.JWT.SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export default jwtAuthMiddleware;
