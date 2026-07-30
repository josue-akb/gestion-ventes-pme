import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Client from '../models/Client.js';
import { calculateTotals } from '../services/saleService.js';
import { createSaleSchema } from '../validators/saleValidator.js';
import Invoice from '../models/Invoice.js';
import { generateInvoicePDF } from '../services/invoiceService.js';

// ── POST /sales ───────────────────────────────────────────────
export const createSale = async (req, res) => {
  const useTransaction = process.env.NODE_ENV !== 'test';
  let session = null;

  try {
    if (useTransaction) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const { error, value } = createSaleSchema.validate(req.body);
    if (error) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ message: error.details[0].message });
    }

    const { clientId, lignes, remiseGlobale, modePaiement } = value;

    const client = await Client.findById(clientId);
    if (!client) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ message: 'Client introuvable' });
    }

    const lignesCompletes = [];
    for (const ligne of lignes) {
      const produit = await Product.findById(ligne.produitId);
      if (!produit) {
        if (session) await session.abortTransaction();
        return res.status(404).json({
          message: `Produit ${ligne.produitId} introuvable`,
        });
      }
      if (produit.stock < ligne.quantite) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          message: `Stock insuffisant pour "${produit.nom}" (disponible: ${produit.stock})`,
        });
      }
      lignesCompletes.push({
        produitId: produit._id,
        nom: produit.nom,
        categorie: produit.categorie,
        quantite: ligne.quantite,
        prixUnitaireHT: produit.prixHT,
        tauxTVA: produit.tauxTVA,
        remiseLigne: ligne.remiseLigne || 0,
        sousTotal: 0,
      });
    }

    const totaux = calculateTotals(lignesCompletes, remiseGlobale);

    const saleData = {
      clientId,
      commercialId: req.user._id,
      lignes: totaux.lignes,
      totalHT: totaux.totalHT,
      remiseGlobale: totaux.remiseGlobale,
      tva: totaux.tva,
      totalTTC: totaux.totalTTC,
      modePaiement,
    };

    let sale;
    if (session) {
      const [created] = await Sale.create([saleData], { session });
      sale = created;
    } else {
      sale = await Sale.create(saleData);
    }

    for (const ligne of lignes) {
      await Product.findByIdAndUpdate(
        ligne.produitId,
        { $inc: { stock: -ligne.quantite } },
        session ? { session } : {}
      );
    }

    if (session) await session.commitTransaction();

   const salePopulated = await sale.populate(['clientId', 'commercialId']);

   // Générer la facture automatiquement
    const invoice = await Invoice.create({
      venteId: sale._id,
      clientId: salePopulated.clientId._id,
      commercialId: sale.commercialId,
      montants: {
        totalHT:       totaux.totalHT,
        remiseGlobale: totaux.remiseGlobale,
        tva:           totaux.tva,
        totalTTC:      totaux.totalTTC,
      },
    });

    try {
      await generateInvoicePDF(invoice, salePopulated, salePopulated.clientId);
      invoice.urlPdf = `/api/invoices/download/${invoice._id}`;
      await invoice.save();
    } catch (pdfErr) {
      console.error('Erreur PDF (non bloquante):', pdfErr.message);
    }

    res.status(201).json({
      message: 'Vente enregistrée avec succès',
      sale: salePopulated,
      invoice: {
        id: invoice._id,
        numero: invoice.numero,
        urlPdf: invoice.urlPdf,
      },
    });
  } catch (err) {
    if (session) await session.abortTransaction();
    console.error('ERREUR VENTE:', err.message);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    if (session) session.endSession();
  }
};
// ── GET /sales ────────────────────────────────────────────────
export const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, clientId, commercialId, statut } = req.query;

    const filter = {};
    if (clientId)     filter.clientId = clientId;
    if (commercialId) filter.commercialId = commercialId;
    if (statut)       filter.statut = statut;

    if (req.user.role === 'commercial') {
      filter.commercialId = req.user._id;
    }

    const total = await Sale.countDocuments(filter);
    const sales = await Sale.find(filter)
      .populate('clientId', 'nom prenom entreprise')
      .populate('commercialId', 'nom prenom')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      sales,
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

// ── GET /sales/:id ────────────────────────────────────────────
export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('clientId', 'nom prenom entreprise email')
      .populate('commercialId', 'nom prenom email');

    if (!sale)
      return res.status(404).json({ message: 'Vente introuvable' });

    res.status(200).json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /sales/export/csv ─────────────────────────────────────
export const exportSalesCSV = async (req, res) => {
  try {
    const { debut, fin } = req.query;
    const filter = {};
    if (debut && fin) {
      filter.createdAt = { $gte: new Date(debut), $lte: new Date(fin) };
    }

    const sales = await Sale.find(filter)
      .populate('clientId', 'nom prenom entreprise')
      .populate('commercialId', 'nom prenom');

    const header = 'numero,date,client,commercial,totalHT,tva,totalTTC,modePaiement,statut\n';
    const rows = sales.map(s =>
      `"${s.numero}","${s.createdAt.toLocaleDateString('fr-FR')}","${s.clientId?.nom} ${s.clientId?.prenom}","${s.commercialId?.nom} ${s.commercialId?.prenom}",${s.totalHT},${s.tva},${s.totalTTC},"${s.modePaiement}","${s.statut}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ventes.csv');
    res.status(200).send(header + rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
  try {
      await generateInvoicePDF(invoice, salePopulated, salePopulated.clientId);
      invoice.urlPdf = `/api/invoices/download/${invoice._id}`;
      await invoice.save();
      console.log('✅ Facture générée :', invoice.numero);
    } catch (pdfErr) {
      console.error('❌ Erreur PDF :', pdfErr.message, pdfErr.stack);
    }
};