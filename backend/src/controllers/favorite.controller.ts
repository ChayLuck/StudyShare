import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { noteId } = req.body;

    if (!userId || !noteId) {
      res.status(400).json({ error: 'Missing userId or noteId' });
      return;
    }

    // Check if already favorited
    const existing = await prisma.noteFavorite.findUnique({
      where: {
        userId_noteId: { userId, noteId }
      }
    });

    if (existing) {
      // Unfavorite
      await prisma.noteFavorite.delete({
        where: { id: existing.id }
      });
      res.json({ favorited: false, message: 'Removed from favorites' });
    } else {
      // Favorite
      await prisma.noteFavorite.create({
        data: { userId, noteId }
      });
      res.json({ favorited: true, message: 'Added to favorites' });
    }
  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const favorites = await prisma.noteFavorite.findMany({
      where: { userId },
      include: {
        note: {
          include: {
            user: { select: { email: true } }
          }
        }
      },
      orderBy: { note: { createdAt: 'desc' } }
    });

    // Extract notes from favorite records
    const notes = favorites.map(f => f.note);

    res.json({ data: notes });
  } catch (error) {
    console.error('Get Favorites Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
