import { Router } from 'express';
import multer from 'multer';
import { uploadNote, getNotes, fuzzySearch, deleteNote, getMyNotes, getMyFavorites, addComment, getComments, summarizeNote } from '../controllers/note.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() }); // Read buffer directly

router.post('/', requireAuth, upload.single('file'), uploadNote);
router.get('/', optionalAuth, getNotes);
router.get('/search', optionalAuth, fuzzySearch);
router.get('/my-notes', requireAuth, getMyNotes);
router.get('/my-favorites', requireAuth, getMyFavorites);
router.delete('/:id', requireAuth, deleteNote);
router.post('/:id/comments', requireAuth, addComment);
router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/summarize', requireAuth, summarizeNote);

export default router;
