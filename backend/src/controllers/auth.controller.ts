import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  verifyToken
} from '../utils/jwt.util';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    const verificationToken = generateEmailVerificationToken(user.email);
    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({ message: 'User registered. Please check email to verify.' });
  } catch (error: any) {
  console.error("🔴 REGISTER ERROR:", error);
  res.status(500).json({ error: 'Internal server error', details: error.message || String(error) });
}
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
       res.status(400).json({ error: 'Invalid credentials' });
       return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
       res.status(400).json({ error: 'Invalid credentials' });
       return;
    }

    if (!user.isEmailVerified) {
       res.status(403).json({ error: 'Please verify your email first' });
       return;
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
} catch (error: any) {
  console.error("🔴 LOGIN ERROR:", error);
  res.status(500).json({ error: 'Internal server error', details: error.message || String(error) });
}
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const payload = verifyEmailVerificationToken(token);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.update({
      where: { email: payload.email },
      data: { isEmailVerified: true },
    });

    res.json({ message: 'Email successfully verified' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Obfuscate response for security
        res.json({ message: 'If an account exists, a reset email has been sent.' });
        return;
    }

    // Usually use a separate short lived token for pass reset
    const token = generateEmailVerificationToken(email); 
    await sendPasswordResetEmail(email, token);

    res.json({ message: 'If an account exists, a reset email has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Missing token or newPassword' });
      return;
    }

    const payload = verifyEmailVerificationToken(token);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
    }
    const payload: any = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
        res.status(403).json({ error: 'User not found' });
        return;
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
