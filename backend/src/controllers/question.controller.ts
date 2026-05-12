import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { uploadToStorage } from '../services/storage.service';

export const createQuestion = async (req: any, res: Response): Promise<void> => {
  try {
    const { content, course, topic } = req.body;
    const userId = req.user.userId || req.user.id;
    const file = req.file;

    if (!content || !course || !topic) {
      res.status(400).json({ error: 'Content, course, and topic are required' });
      return;
    }

    let fileUrl = null;
    let fileType = 'text';

    if (file) {
      fileUrl = await uploadToStorage(file.buffer, file.originalname, file.mimetype);
      fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    }

    const question = await prisma.question.create({
      data: {
        content,
        course,
        topic,
        userId,
        fileUrl,
        fileType
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    res.status(201).json({ question });
  } catch (error: any) {
    console.error('Create Question Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { course, topic, search, userId, answeredByMe } = req.query;

    const where: any = {};
    if (typeof course === 'string') where.course = course;
    if (typeof topic === 'string') where.topic = topic;
    
    if (typeof userId === 'string') {
      where.userId = userId;
    }

    if (answeredByMe === 'true' && (req as any).user) {
      const uId = (req as any).user.userId || (req as any).user.id;
      if (uId) {
        where.answers = {
          some: {
            userId: uId
          }
        };
      }
    }

    if (typeof search === 'string') {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { course: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        },
        _count: {
          select: { answers: true }
        }
      }
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        },
        answers: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json({ question });
  } catch (error) {
    console.error('Get Question Detail Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteQuestion = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const question = await prisma.question.findUnique({ where: { id } });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (question.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized to delete this question' });
      return;
    }

    await prisma.question.delete({ where: { id } });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
