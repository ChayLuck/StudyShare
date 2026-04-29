import { Router } from 'express';
import { toggleFavorite, getFavorites } from '../controllers/favorite.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/toggle', requireAuth, toggleFavorite);
router.get('/', requireAuth, getFavorites);

export default router;
