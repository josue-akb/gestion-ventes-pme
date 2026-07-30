import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Invoice from '../models/Invoice.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import { generateInvoicePDF } from '../services/invoiceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── POST /invoices (générer depuis une vente) ─────────────────
export const createInvoice = async (req, res) => {
  try {
    const { venteId } = req.body;
    if (!venteId)
      return res.status(400).json({ message: 'venteId obligatoire' });

    // Vérifier que la vente existe
    const vente = await Sale.findById(venteId)
      .populate('clientId')
      .populate('commercialId', 'nom prenom');

    if (!vente)
      return res.status(404).json({ message: 'Vente introuvable' });

    // Vérifier qu'une facture n'existe pas déjà
    const existante = await Invoice.findOne({ venteId });
    if (existante)
      return res.status(409).json({
        message: 'Une facture existe déjà pour cette vente',
        invoice: existante,
      });

    const client = vente.clientId;

    // Créer la facture en base
    const invoice = await Invoice.create({
      venteId,
      clientId: client._id,
      commercialId: vente.commercialId._id,
      montants: {
        totalHT:       vente.totalHT,
        remiseGlobale: vente.remiseGlobale,
        tva:           vente.tva,
        totalTTC:      vente.totalTTC,
      },
    });

    // Générer le PDF
    const { fileName } = await generateInvoicePDF(invoice, vente, client);
    invoice.urlPdf = `/invoices/download/${invoice._id}`;
    await invoice.save();

    res.status(201).json({
      message: 'Facture générée avec succès',
      invoice,
      urlPdf: invoice.urlPdf,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /invoices ─────────────────────────────────────────────
export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, clientId, statut } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (statut)   filter.statut = statut;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('clientId', 'nom prenom entreprise')
      .populate('commercialId', 'nom prenom')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      invoices,
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

// ── GET /invoices/:id ─────────────────────────────────────────
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('clientId', 'nom prenom entreprise email adresse')
      .populate('venteId')
      .populate('commercialId', 'nom prenom');

    if (!invoice)
      return res.status(404).json({ message: 'Facture introuvable' });

    res.status(200).json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /invoices/download/:id ────────────────────────────────
export const downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice)
      return res.status(404).json({ message: 'Facture introuvable' });

    const filePath = path.join(
      __dirname, '../../uploads/invoices',
      `${invoice.numero}.pdf`
    );

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'Fichier PDF introuvable' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.numero}.pdf`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};