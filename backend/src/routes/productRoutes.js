// backend/src/routes/productRoutes.js
import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockAlerts,
  exportCSV,
  importCSV,
} from '../controllers/productController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Toutes les routes nécessitent d'être authentifié
router.use(protect);

// Lecture — accessible à tous les rôles
router.get('/',                   getProducts);
router.get('/alertes/stock-bas',  getStockAlerts);
router.get('/export/csv',         exportCSV);
router.get('/:id',                getProductById);

// Écriture — admin seulement
router.post('/',              authorize('admin'), createProduct);
router.post('/import/csv',    authorize('admin'), importCSV);
router.put('/:id',            authorize('admin'), updateProduct);
router.delete('/:id',         authorize('admin'), deleteProduct);

export default router;