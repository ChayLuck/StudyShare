import { Router } from 'express';
import { getReportedNotes, verifyNote, deleteNote, getAllNotes } from '../controllers/admin.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAdmin); // Applyy middleware to all admin routes

router.get('/reports', getReportedNotes);
router.get('/notes', getAllNotes);
router.post('/notes/:id/verify', verifyNote);
router.delete('/notes/:id', deleteNote);

export default router;
