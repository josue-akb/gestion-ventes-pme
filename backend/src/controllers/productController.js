
import Product from '../models/Product.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';

// ── GET /products ─────────────────────────────────────────────
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      categorie,
      search,
      stockBas,
      actif = true,
    } = req.query;

    const filter = { actif: actif === 'true' || actif === true };
    if (categorie) filter.categorie = categorie;
    if (stockBas === 'true') filter.$expr = { $lte: ['$stock', '$seuilAlerte'] };
    if (search) filter.$text = { $search: search };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      products,
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

// ── GET /products/:id ─────────────────────────────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Produit introuvable' });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── POST /products ────────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const product = await Product.create(value);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── PUT /products/:id ─────────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );
    if (!product)
      return res.status(404).json({ message: 'Produit introuvable' });

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── DELETE /products/:id (désactivation logique) ──────────────
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ message: 'Produit introuvable' });

    res.status(200).json({ message: 'Produit désactivé', product });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /products/alertes/stock-bas ───────────────────────────
export const getStockAlerts = async (req, res) => {
  try {
    const products = await Product.find({
      actif: true,
      $expr: { $lte: ['$stock', '$seuilAlerte'] },
    }).sort({ stock: 1 });

    res.status(200).json({
      count: products.length,
      products,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /products/export/csv ──────────────────────────────────
export const exportCSV = async (req, res) => {
  try {
    const products = await Product.find({ actif: true });

    const header = 'nom,categorie,prixHT,tauxTVA,stock,seuilAlerte\n';
    const rows = products.map(p =>
      `"${p.nom}","${p.categorie}",${p.prixHT},${p.tauxTVA},${p.stock},${p.seuilAlerte}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=produits.csv');
    res.status(200).send(header + rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── POST /products/import/csv ─────────────────────────────────
export const importCSV = async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData)
      return res.status(400).json({ message: 'Données CSV manquantes' });

    const lines = csvData.trim().split('\n').slice(1); // skip header
    const results = { created: 0, errors: [] };

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
      const [nom, categorie, prixHT, tauxTVA, stock, seuilAlerte] = cols;

      const { error } = createProductSchema.validate({
        nom, categorie,
        prixHT: Number(prixHT),
        tauxTVA: Number(tauxTVA),
        stock: Number(stock),
        seuilAlerte: Number(seuilAlerte),
      });

      if (error) {
        results.errors.push({ ligne: i + 2, erreur: error.details[0].message });
        continue;
      }

      await Product.create({
        nom, categorie,
        prixHT: Number(prixHT),
        tauxTVA: Number(tauxTVA),
        stock: Number(stock),
        seuilAlerte: Number(seuilAlerte),
      });
      results.created++;
    }

    res.status(200).json({
      message: `Import terminé : ${results.created} produit(s) créé(s)`,
      ...results,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};