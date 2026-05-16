import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { uploadToStorage } from '../services/storage.service';

export const createAnswer = async (req: any, res: Response): Promise<void> => {
  try {
    const { content, questionId } = req.body;
    const userId = req.user.userId || req.user.id;
    const file = req.file;

    if (!content || !questionId) {
      res.status(400).json({ error: 'Content and questionId are required' });
      return;
    }

    let fileUrl = null;
    let fileType = 'text';

    if (file) {
      fileUrl = await uploadToStorage(file.buffer, file.originalname, file.mimetype);
      fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    }

    const answer = await prisma.answer.create({
      data: {
        content,
        questionId,
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

    // Update user points (+5 for answering a question)
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 5 } }
    });

    res.status(201).json({ answer });
  } catch (error: any) {
    console.error('Create Answer Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsCorrect = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: { question: true }
    });

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (answer.question.userId !== userId) {
      res.status(403).json({ error: 'Only the question owner can mark as correct' });
      return;
    }

    if (!answer.isCorrect) {
      // If we are marking this as correct, unmark all other answers for this question
      await prisma.answer.updateMany({
        where: { questionId: answer.questionId, isCorrect: true },
        data: { isCorrect: false }
      });
    }

    // Toggle isCorrect
    const updatedAnswer = await prisma.answer.update({
      where: { id },
      data: { isCorrect: !answer.isCorrect }
    });

    // Check if there are any correct answers left for this question
    const correctAnswersCount = await prisma.answer.count({
      where: { 
        questionId: answer.questionId, 
        isCorrect: true 
      }
    });

    // Update question resolved status
    await prisma.question.update({
      where: { id: answer.questionId },
      data: { isResolved: correctAnswersCount > 0 }
    });

    res.json({ answer: updatedAnswer });
  } catch (error) {
    console.error('Mark Correct Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsSpam = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: { question: true }
    });

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (answer.question.userId !== userId) {
      res.status(403).json({ error: 'Only the question owner can mark as spam' });
      return;
    }

    const updatedAnswer = await prisma.answer.update({
      where: { id },
      data: { isSpam: true }
    });

    res.json({ answer: updatedAnswer });
  } catch (error) {
    console.error('Mark Spam Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAnswer = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const answer = await prisma.answer.findUnique({ 
      where: { id },
      include: { question: true }
    });

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    // Can be deleted by answer owner OR question owner
    if (answer.userId !== userId && answer.question.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.answer.delete({ where: { id } });
    
    // Decrement user points (-5 for deleted answer)
    await prisma.user.update({
      where: { id: answer.userId },
      data: { points: { decrement: 5 } }
    });
    
    // Update question resolved status after deletion
    const correctAnswersCount = await prisma.answer.count({
      where: { 
        questionId: answer.questionId, 
        isCorrect: true 
      }
    });

    await prisma.question.update({
      where: { id: answer.questionId },
      data: { isResolved: correctAnswersCount > 0 }
    });

    res.json({ message: 'Answer deleted' });
  } catch (error) {
    console.error('Delete Answer Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
