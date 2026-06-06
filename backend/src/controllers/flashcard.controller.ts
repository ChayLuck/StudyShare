import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateFlashcardsFromNote } from '../services/flashcard.service';

export const generateFlashcards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const noteId = req.params.noteId as string;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { flashcards: true }
    });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // If flashcards already exist for this note, return them
    if (note.flashcards && note.flashcards.length > 0) {
      res.json({ message: 'Flashcards already exist', data: note.flashcards });
      return;
    }

    // Generate new flashcards
    const generatedCards = await generateFlashcardsFromNote(note.fileUrl, note.mimeType);

    if (!generatedCards || generatedCards.length === 0) {
      res.status(500).json({ error: 'Failed to generate flashcards.' });
      return;
    }

    // Save to DB
    const createdCards = await prisma.$transaction(
      generatedCards.map(card => prisma.flashcard.create({
        data: {
          front: card.front,
          back: card.back,
          noteId: noteId
        }
      }))
    );

    res.status(201).json({ message: 'Flashcards generated successfully', data: createdCards });
  } catch (error: any) {
    console.error('Generate Flashcards Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getFlashcards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const noteId = req.params.noteId as string;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { noteId },
      include: {
        progress: {
          where: { userId }
        }
      }
    });

    // Format the response to include the progress easily
    const formattedCards = flashcards.map((card: any) => {
      const userProgress = card.progress[0];
      return {
        id: card.id,
        front: card.front,
        back: card.back,
        isKnown: userProgress ? userProgress.isKnown : false,
        hasProgress: !!userProgress
      };
    });

    res.json({ data: formattedCards });
  } catch (error: any) {
    console.error('Get Flashcards Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const flashcardId = req.params.id as string;
    const userId = req.user?.userId;
    const { isKnown } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (typeof isKnown !== 'boolean') {
      res.status(400).json({ error: 'isKnown must be a boolean' });
      return;
    }

    const progress = await prisma.flashcardProgress.upsert({
      where: {
        userId_flashcardId: {
          userId,
          flashcardId
        }
      },
      update: {
        isKnown,
        updatedAt: new Date()
      },
      create: {
        userId,
        flashcardId,
        isKnown
      }
    });

    res.json({ message: 'Progress updated', data: progress });
  } catch (error: any) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
