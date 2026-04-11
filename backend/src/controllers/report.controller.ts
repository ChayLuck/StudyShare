import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const reportNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { noteId, reason } = req.body;

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (note.isVerified) {
      res.status(400).json({ error: 'Verified notes cannot be reported' });
      return;
    }

    // Check if user already reported it
    const existingReq = await prisma.report.findUnique({
      where: { userId_noteId: { userId, noteId } }
    });

    if (existingReq) {
      res.status(400).json({ error: 'You have already reported this note' });
      return;
    }

    await prisma.report.create({
      data: { userId, noteId, reason }
    });

    // Check report count
    const reportCount = await prisma.report.count({ where: { noteId } });
    
    if (reportCount >= 3) {
      await prisma.note.update({
        where: { id: noteId },
        data: { isHidden: true, needsReview: true }
      });
    }

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    // Optionally fetch their own reports
    res.status(200).json({ message: 'Not implemented for standard users' });
};
