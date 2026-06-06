import { Router } from 'express';
import { generateFlashcards, getFlashcards, updateProgress } from '../controllers/flashcard.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// All flashcard routes require authentication
router.use(requireAuth);

// Generate flashcards for a note
router.post('/generate/:noteId', generateFlashcards);

// Get flashcards for a note
router.get('/note/:noteId', getFlashcards);

// Update user progress on a specific flashcard
router.post('/:id/progress', updateProgress);

export default router;
