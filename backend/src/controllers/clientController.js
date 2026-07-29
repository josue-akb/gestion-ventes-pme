// backend/src/controllers/clientController.js
import Client from '../models/Client.js';
import { createClientSchema, updateClientSchema } from '../validators/clientValidator.js';

// ── GET /clients ──────────────────────────────────────────────
export const getClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, actif = true } = req.query;

    const filter = { actif: actif === 'true' || actif === true };
    if (search) filter.$text = { $search: search };

    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      clients,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /clients/:id ──────────────────────────────────────────
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client)
      return res.status(404).json({ message: 'Client introuvable' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── POST /clients ─────────────────────────────────────────────
export const createClient = async (req, res) => {
  try {
    const { error, value } = createClientSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Vérification doublon email
    const existing = await Client.findOne({ email: value.email });
    if (existing)
      return res.status(409).json({ message: 'Un client avec cet email existe déjà' });

    const client = await Client.create(value);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── PUT /clients/:id ──────────────────────────────────────────
export const updateClient = async (req, res) => {
  try {
    const { error, value } = updateClientSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );
    if (!client)
      return res.status(404).json({ message: 'Client introuvable' });

    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── DELETE /clients/:id (désactivation logique) ───────────────
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true }
    );
    if (!client)
      return res.status(404).json({ message: 'Client introuvable' });

    res.status(200).json({ message: 'Client désactivé', client });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /clients/:id/historique ───────────────────────────────
export const getHistoriqueClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client)
      return res.status(404).json({ message: 'Client introuvable' });

    // On récupère les ventes liées à ce client
    res.status(200).json({
      client,
      historique: [],
      totalAchats: 0,
      totalCA: 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};