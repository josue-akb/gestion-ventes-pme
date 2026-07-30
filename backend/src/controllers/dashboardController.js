import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Client from '../models/Client.js';
import User from '../models/User.js';

// Utilitaire — filtre de période
const getPeriodeFilter = (periode, debut, fin) => {
  const now = new Date();
  let dateDebut, dateFin;

  if (debut && fin) {
    dateDebut = new Date(debut);
    dateFin = new Date(fin);
  } else {
    switch (periode) {
      case 'jour':
        dateDebut = new Date(now.setHours(0, 0, 0, 0));
        dateFin = new Date();
        break;
      case 'semaine':
        dateDebut = new Date(now.setDate(now.getDate() - 7));
        dateFin = new Date();
        break;
      case 'annee':
        dateDebut = new Date(now.getFullYear(), 0, 1);
        dateFin = new Date();
        break;
      case 'mois':
      default:
        dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFin = new Date();
        break;
    }
  }

  return { $gte: dateDebut, $lte: dateFin };
};

// ── GET /dashboard ────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const { periode = 'mois', debut, fin } = req.query;
    const dateFilter = getPeriodeFilter(periode, debut, fin);
    const matchFilter = { createdAt: dateFilter, statut: 'validee' };

    // ── KPIs principaux ──────────────────────────────────────
    const kpis = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalCA:      { $sum: '$totalTTC' },
          totalHT:      { $sum: '$totalHT' },
          totalTVA:     { $sum: '$tva' },
          nbVentes:     { $sum: 1 },
          panierMoyen:  { $avg: '$totalTTC' },
        },
      },
    ]);

    const kpisData = kpis[0] || {
      totalCA: 0, totalHT: 0, totalTVA: 0,
      nbVentes: 0, panierMoyen: 0,
    };

    // ── Évolution CA par mois (12 derniers mois) ─────────────
    const evolutionCA = await Sale.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
            $lte: new Date(),
          },
          statut: 'validee',
        },
      },
      {
        $group: {
          _id: {
            annee: { $year: '$createdAt' },
            mois:  { $month: '$createdAt' },
          },
          ca:       { $sum: '$totalTTC' },
          nbVentes: { $sum: 1 },
        },
      },
      { $sort: { '_id.annee': 1, '_id.mois': 1 } },
      {
        $project: {
          _id: 0,
          mois: {
            $concat: [
              { $toString: '$_id.annee' }, '-',
              { $toString: '$_id.mois' },
            ],
          },
          ca:       1,
          nbVentes: 1,
        },
      },
    ]);

    // ── Top 5 produits par CA ─────────────────────────────────
    const topProduits = await Sale.aggregate([
      { $match: matchFilter },
      { $unwind: '$lignes' },
      {
        $group: {
          _id:     '$lignes.produitId',
          nom:     { $first: '$lignes.nom' },
          totalCA: { $sum: '$lignes.sousTotal' },
          nbVentes: { $sum: '$lignes.quantite' },
        },
      },
      { $sort: { totalCA: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          produitId: '$_id',
          nom:       1,
          totalCA:   1,
          nbVentes:  1,
        },
      },
    ]);

    // ── Top 5 clients par CA ──────────────────────────────────
    const topClients = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id:      '$clientId',
          totalCA:  { $sum: '$totalTTC' },
          nbAchats: { $sum: 1 },
        },
      },
      { $sort: { totalCA: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'clients',
          localField:   '_id',
          foreignField: '_id',
          as:           'client',
        },
      },
      { $unwind: '$client' },
      {
        $project: {
          _id: 0,
          clientId: '$_id',
          nom:      { $concat: ['$client.nom', ' ', '$client.prenom'] },
          entreprise: '$client.entreprise',
          totalCA:  1,
          nbAchats: 1,
        },
      },
    ]);

    // ── Performances par commercial ───────────────────────────
    const performancesCommerciaux = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id:         '$commercialId',
          totalCA:     { $sum: '$totalTTC' },
          nbVentes:    { $sum: 1 },
          panierMoyen: { $avg: '$totalTTC' },
        },
      },
      { $sort: { totalCA: -1 } },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'commercial',
        },
      },
      { $unwind: '$commercial' },
      {
        $project: {
          _id: 0,
          commercialId: '$_id',
          nom: {
            $concat: ['$commercial.nom', ' ', '$commercial.prenom'],
          },
          totalCA:     1,
          nbVentes:    1,
          panierMoyen: 1,
        },
      },
    ]);

    // ── Alertes stock bas ─────────────────────────────────────
    const stockAlertes = await Product.countDocuments({
      actif: true,
      $expr: { $lte: ['$stock', '$seuilAlerte'] },
    });

    // ── Nouveaux clients sur la période ──────────────────────
    const nouveauxClients = await Client.countDocuments({
      createdAt: dateFilter,
      actif: true,
    });

    res.status(200).json({
      periode,
      kpis: {
        totalCA:      +kpisData.totalCA.toFixed(2),
        totalHT:      +kpisData.totalHT.toFixed(2),
        totalTVA:     +kpisData.totalTVA.toFixed(2),
        nbVentes:     kpisData.nbVentes,
        panierMoyen:  +kpisData.panierMoyen.toFixed(2),
        nouveauxClients,
        stockAlertes,
      },
      evolutionCA,
      topProduits,
      topClients,
      performancesCommerciaux,
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /dashboard/stats/ventes ───────────────────────────────
export const getStatsVentes = async (req, res) => {
  try {
    const { periode = 'mois' } = req.query;
    const dateFilter = getPeriodeFilter(periode);

    const stats = await Sale.aggregate([
      { $match: { createdAt: dateFilter, statut: 'validee' } },
      {
        $group: {
          _id:          { $dayOfWeek: '$createdAt' },
          totalCA:      { $sum: '$totalTTC' },
          nbVentes:     { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const statsFormatees = stats.map(s => ({
      jour:     jours[s._id - 1],
      totalCA:  +s.totalCA.toFixed(2),
      nbVentes: s.nbVentes,
    }));

    res.status(200).json({ stats: statsFormatees });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};