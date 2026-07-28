
import express from 'express';
import { login, logout, refresh } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login',   login);
router.post('/refresh', refresh);
router.post('/logout',  protect, logout);

export default router;