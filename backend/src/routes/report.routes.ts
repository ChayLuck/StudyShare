import { Router } from 'express';
import { reportNote, getReports } from '../controllers/report.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', requireAuth, reportNote);
router.get('/', requireAuth, getReports);

export default router;
