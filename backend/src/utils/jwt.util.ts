import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const generateEmailVerificationToken = (email: string) => {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyEmailVerificationToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { email: string };
};
