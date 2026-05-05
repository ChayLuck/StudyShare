"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = exports.optionalAuth = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (!token)
        return next();
    try {
        const payload = (0, jwt_util_1.verifyToken)(token);
        req.user = payload;
    }
    catch (error) {
        // If token is invalid, we can just treat them as guest or throw error.
        // Given the prompt, let's just proceed without user info (guest).
    }
    next();
};
exports.optionalAuth = optionalAuth;
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Invalid token format' });
        return;
    }
    try {
        const payload = (0, jwt_util_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = (req, res, next) => {
    (0, exports.requireAuth)(req, res, () => {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        next();
    });
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.middleware.js.map