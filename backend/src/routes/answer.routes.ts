import { Router } from 'express';
import { createAnswer, markAsCorrect, markAsSpam, deleteAnswer } from '../controllers/answer.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', requireAuth, upload.single('file'), createAnswer);
router.patch('/:id/correct', requireAuth, markAsCorrect);
router.patch('/:id/spam', requireAuth, markAsSpam);
router.delete('/:id', requireAuth, deleteAnswer);

export default router;
