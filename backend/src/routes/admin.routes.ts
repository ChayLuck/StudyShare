import { Router } from 'express';
import { getReportedNotes, verifyNote, deleteNote } from '../controllers/admin.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAdmin); // Apply middleware to all admin routes

router.get('/reports', getReportedNotes);
router.post('/notes/:id/verify', verifyNote);
router.delete('/notes/:id', deleteNote);

export default router;
