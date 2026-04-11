import { Router } from 'express';
import { 
  register, 
  login, 
  verifyEmail, 
  requestPasswordReset, 
  resetPassword,
  refreshToken 
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

export default router;
