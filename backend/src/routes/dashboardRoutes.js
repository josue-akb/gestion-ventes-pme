import express from 'express';
import {
  getDashboard,
  getStatsVentes,
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'responsable'));

router.get('/',              getDashboard);
router.get('/stats/ventes',  getStatsVentes);

export default router;