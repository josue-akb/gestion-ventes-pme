// backend/src/routes/clientRoutes.js
import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getHistoriqueClient,
} from '../controllers/clientController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Accessible à tous les rôles authentifiés
router.get('/',           getClients);
router.get('/:id',        getClientById);
router.get('/:id/historique', getHistoriqueClient);

// Commercial, responsable et admin peuvent créer/modifier
router.post('/',   authorize('admin', 'responsable', 'commercial'), createClient);
router.put('/:id', authorize('admin', 'responsable', 'commercial'), updateClient);

// Désactivation — admin seulement
router.delete('/:id', authorize('admin'), deleteClient);

export default router;