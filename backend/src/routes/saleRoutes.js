import express from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  exportSalesCSV,
} from '../controllers/saleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/',             getSales);
router.get('/export/csv',   authorize('admin', 'responsable'), exportSalesCSV);
router.get('/:id',          getSaleById);
router.post('/',            authorize('admin', 'responsable', 'commercial'), createSale);

export default router;