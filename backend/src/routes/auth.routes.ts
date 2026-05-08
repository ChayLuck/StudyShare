import { Router } from 'express';
import { 
  register, 
  login, 
  verifyEmail, 
  requestPasswordReset, 
  resetPassword,
  refreshToken,
  getMe,
  updateProfile,
  deleteAccount,
  getLeaderboard
} from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.get('/me', requireAuth, getMe);
router.put('/update-profile', requireAuth, upload.single('avatar'), updateProfile);
router.delete('/delete-account', requireAuth, deleteAccount);
router.get('/leaderboard', getLeaderboard);

export default router;
