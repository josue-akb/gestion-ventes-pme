import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  downloadInvoice,
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/',                   getInvoices);
router.get('/download/:id',       downloadInvoice);
router.get('/:id',                getInvoiceById);
router.post('/',                  authorize('admin', 'responsable', 'commercial'), createInvoice);

export default router;