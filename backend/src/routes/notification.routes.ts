import { Router } from 'express';
import { getNotifications, markAllRead, markOneRead } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.post('/read', requireAuth, markAllRead);
router.post('/:id/read', requireAuth, markOneRead);

export default router;
