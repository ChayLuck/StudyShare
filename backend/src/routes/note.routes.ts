import { Router } from 'express';
import multer from 'multer';
import { uploadNote, getNotes, fuzzySearch, deleteNote } from '../controllers/note.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() }); // Read buffer directly

router.post('/', requireAuth, upload.single('file'), uploadNote);
router.get('/', optionalAuth, getNotes);
router.get('/search', optionalAuth, fuzzySearch);
router.delete('/:id', requireAuth, deleteNote);

export default router;
