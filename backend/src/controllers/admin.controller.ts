import { Response, Request } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getReportedNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notes = await prisma.note.findMany({
      where: { needsReview: true },
      include: {
        reports: true,
        user: { select: { email: true } }
      }
    });
    
    res.json({ data: notes });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Mark verified, unhide, and clear reports
    await prisma.$transaction([
      prisma.note.update({
        where: { id },
        data: { isVerified: true, isHidden: false, needsReview: false }
      }),
      prisma.report.deleteMany({
        where: { noteId: id }
      })
    ]);

    res.json({ message: 'Note verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        await prisma.$transaction([
            prisma.noteFavorite.deleteMany({ where: { noteId: id } }),
            prisma.report.deleteMany({ where: { noteId: id } }),
            prisma.note.delete({ where: { id } })
        ]);
        res.json({ message: 'Note deleted permanently' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
