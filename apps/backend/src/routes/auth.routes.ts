import { Router } from 'express';
import { register, login, profile, updateAvatar, loginConGoogle } from '../controllers/auth.controller';
import { authGuard } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(loginConGoogle));
router.get('/profile', authGuard, asyncHandler(profile));
router.put('/avatar', authGuard, asyncHandler(updateAvatar));

export default router;
