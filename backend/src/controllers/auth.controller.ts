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
import { uploadToStorage } from '../services/storage.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  console.log('[REGISTER] Request received:', req.body.email);
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      console.log('[REGISTER] Missing email or password');
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

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
        name: name || null
      },
    });

    console.log('[REGISTER] User created:', { email: user.email, id: user.id });
    const verificationToken = generateEmailVerificationToken(user.email);
    console.log('[REGISTER] Sending verification email to', user.email);
    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({ message: 'User registered. Please check email to verify.' });
  } catch (error: any) {
  console.error("🔴 REGISTER ERROR:", error);
  res.status(500).json({ error: 'Internal server error', details: error.stack || String(error) });
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

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
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
    const userId = payload.userId || payload.id;
    if (typeof userId !== 'string' || userId.trim() === '') {
        res.status(401).json({ error: 'Invalid token payload' });
        return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });

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

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized (No user payload)' });
      return;
    }
    const userId = req.user.userId || req.user.id;
    console.log('DEBUG: Resolved userId =', userId);
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof userId !== 'string' || !uuidRegex.test(userId)) {
      console.log('DEBUG: userId is not a valid UUID string:', userId);
      res.status(401).json({ error: 'Unauthorized (Invalid user ID format)' });
      return;
    }

    const user = await prisma.user.findUnique({

      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        university: true,
        avatarUrl: true,
        role: true,
        points: true,
        createdAt: true,
        _count: {
          select: {
            notes: true,
            favoriteNotes: true
          }
        }
      }
    });

    console.log('DEBUG: User found in DB =', user ? 'YES' : 'NO');
    if (!user) {
      console.log('DEBUG: User not found in DB for ID:', userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('GET_ME ERROR:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized (No user payload)' });
      return;
    }
    const userId = req.user.userId || req.user.id;
    if (typeof userId !== 'string' || userId.trim() === '') {
      res.status(401).json({ error: 'Unauthorized (Invalid user ID)' });
      return;
    }
    const { name, university, currentPassword, newPassword } = req.body;
    console.log('DEBUG: updateProfile body =', req.body);
    const avatar = req.file;

    const updateData: any = {};
    if (name !== undefined && name !== null) updateData.name = name;
    if (university !== undefined && university !== null) updateData.university = university;

    if (avatar) {
      const avatarUrl = await uploadToStorage(avatar.buffer, avatar.originalname, avatar.mimetype);
      updateData.avatarUrl = avatarUrl;
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new one' });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      res.json({ message: 'No changes made', user: { id: userId } });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, university: true, avatarUrl: true }
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId || req.user.id;

    // Delete related data first (depending on schema relations)
    // Prisma relation 'onDelete: Cascade' in schema would handle this, 
    // but if not, we do it manually.
    
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaderboard = async (req: any, res: Response): Promise<void> => {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        university: true,
        avatarUrl: true,
        points: true,
      }
    });
    res.json({ data: topUsers });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
