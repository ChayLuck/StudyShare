import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) return next();
  try {
    const payload = verifyToken(token) as { userId: string; role: string };
    req.user = payload;
  } catch (error) {
    // If token is invalid, we can just treat them as guest or throw error.
    // Given the prompt, let's just proceed without user info (guest).
  }
  next();
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  console.log('DEBUG: Received token =', token?.substring(0, 10) + '...');
  if (!token) {
    res.status(401).json({ error: 'Invalid token format' });
    return;
  }
  try {
    const payload = verifyToken(token) as { userId: string; role: string };
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
};
