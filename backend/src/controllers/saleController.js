import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Client from '../models/Client.js';
import { calculateTotals } from '../services/saleService.js';
import { createSaleSchema } from '../validators/saleValidator.js';

// ── POST /sales ───────────────────────────────────────────────
export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validation Joi
    const { error, value } = createSaleSchema.validate(req.body);
    if (error) {
      await session.abortTransaction();
      return res.status(400).json({ message: error.details[0].message });
    }

    const { clientId, lignes, remiseGlobale, modePaiement } = value;

    // Vérifier que le client existe
    const client = await Client.findById(clientId).session(session);
    if (!client) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Client introuvable' });
    }

    // Vérifier chaque produit et son stock
    const lignesCompletes = [];
    for (const ligne of lignes) {
      const produit = await Product.findById(ligne.produitId).session(session);
      if (!produit) {
        await session.abortTransaction();
        return res.status(404).json({
          message: `Produit ${ligne.produitId} introuvable`,
        });
      }
      if (produit.stock < ligne.quantite) {
        await session.abortTransaction();
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
        sousTotal: 0, // sera calculé
      });
    }

    // Calcul des totaux
    const totaux = calculateTotals(lignesCompletes, remiseGlobale);

    // Créer la vente
    const [sale] = await Sale.create(
      [{
        clientId,
        commercialId: req.user._id,
        lignes: totaux.lignes,
        totalHT: totaux.totalHT,
        remiseGlobale: totaux.remiseGlobale,
        tva: totaux.tva,
        totalTTC: totaux.totalTTC,
        modePaiement,
      }],
      { session }
    );

    // Décrémenter le stock de chaque produit (transaction atomique)
    for (const ligne of lignes) {
      await Product.findByIdAndUpdate(
        ligne.produitId,
        { $inc: { stock: -ligne.quantite } },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(201).json({
      message: 'Vente enregistrée avec succès',
      sale: await sale.populate(['clientId', 'commercialId']),
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    session.endSession();
  }
};

// ── GET /sales ────────────────────────────────────────────────
export const getSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      clientId,
      commercialId,
      statut,
    } = req.query;

    const filter = {};
    if (clientId)     filter.clientId = clientId;
    if (commercialId) filter.commercialId = commercialId;
    if (statut)       filter.statut = statut;

    // Commercial ne voit que ses propres ventes
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
      filter.createdAt = {
        $gte: new Date(debut),
        $lte: new Date(fin),
      };
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
};