import { Router } from 'express';
import { createQuestion, getQuestions, getQuestionById, deleteQuestion } from '../controllers/question.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', optionalAuth, getQuestions);
router.get('/:id', getQuestionById);
router.post('/', requireAuth, upload.single('file'), createQuestion);
router.delete('/:id', requireAuth, deleteQuestion);

export default router;
