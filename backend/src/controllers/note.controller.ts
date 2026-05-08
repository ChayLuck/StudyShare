import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { uploadToStorage } from '../services/storage.service';
import { checkMagicNumbers } from '../utils/file.util';
import { containsProfanity } from '../services/profanity.service';
import { indexMetadata, searchMetadata } from '../services/search.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export const uploadNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseName, schoolName, description } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      res.status(400).json({ error: 'File size exceeds 10MB limit' });
      return;
    }

    if (!checkMagicNumbers(file.buffer)) {
      res.status(400).json({ error: 'Invalid file type. Only PDF and certain Images are allowed.' });
      return;
    }

    if (containsProfanity(courseName) || containsProfanity(schoolName) || (description && containsProfanity(description))) {
      res.status(400).json({ error: 'Profanity detected in input fields.' });
      return;
    }

    const upperCourseName = courseName.toUpperCase();
    const upperSchoolName = schoolName.toUpperCase();

    // Mock Upload
    const fileUrl = await uploadToStorage(file.buffer, file.originalname, file.mimetype);

    // Save to DB
    const note = await prisma.note.create({
      data: {
        courseName: upperCourseName,
        schoolName: upperSchoolName,
        description,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        userId
      }
    });

    // Background index to ElasticSearch
    indexMetadata('course', upperCourseName);
    indexMetadata('school', upperSchoolName);

    // Update user points (+10 for uploading)
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 10 } }
    });

    res.status(201).json({ message: 'Note uploaded successfully', note });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page: pageQuery, limit: limitQuery, school, search } = req.query;
    console.log(`📡 GET /notes: page=${pageQuery}, limit=${limitQuery}, school=${school}, search=${search}`);
    const page = parseInt(pageQuery as string) || 1;
    const limit = parseInt(limitQuery as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = { isHidden: false };
    
    // School filter from chips
    if (school && school !== 'ALL') {
      where.schoolName = school as string;
    }

    // Global search query
    if (search) {
      where.OR = [
        { courseName: { contains: search as string, mode: 'insensitive' } },
        { schoolName: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Only fetch notes that match criteria
    const notes = await prisma.note.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      }
    });

    const total = await prisma.note.count({ where });
    console.log(`✅ Found ${notes.length} notes (Total matching: ${total})`);

    res.json({
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: (error as any).message, stack: (error as any).stack });
  }
};

// Fuzzy search endpoints
export const fuzzySearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, query } = req.query;
    if (!type || !query || (type !== 'school' && type !== 'course')) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    const results = await searchMetadata(type as 'school' | 'course', query as string);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Search error' });
  }
};
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (note.userId !== userId) {
      res.status(403).json({ error: 'You do not have permission to delete this note' });
      return;
    }

    // Delete associated favorites and reports first to avoid foreign key constraint errors
    await prisma.$transaction([
      prisma.noteFavorite.deleteMany({
        where: { noteId: id }
      }),
      prisma.report.deleteMany({
        where: { noteId: id }
      }),
      prisma.note.delete({
        where: { id }
      })
    ]);

    res.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Delete Note Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getMyNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { favorites: true } } }
    });
    res.json({ data: notes });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
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
            user: { select: { email: true, name: true } },
            _count: { select: { favorites: true } }
          }
        }
      },
      orderBy: { note: { createdAt: 'desc' } }
    });
    res.json({ data: favorites.map(f => f.note) });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const noteId = req.params.id as string;
    const { text } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!text || text.trim() === '') {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        userId,
        noteId
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error: any) {
    console.error('Add Comment Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteId = req.params.id as string;
    const comments = await prisma.comment.findMany({
      where: { noteId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: comments });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
