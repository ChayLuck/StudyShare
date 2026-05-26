import { Router } from 'express';
import { getReportedNotes, verifyNote, deleteNote, getAllNotes, getAllUsers, deleteUser } from '../controllers/admin.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAdmin); // Applyy middleware to all admin routes

router.get('/reports', getReportedNotes);
router.get('/notes', getAllNotes);
router.get('/users', getAllUsers);
router.post('/notes/:id/verify', verifyNote);
router.delete('/notes/:id', deleteNote);
router.delete('/users/:id', deleteUser);

export default router;
