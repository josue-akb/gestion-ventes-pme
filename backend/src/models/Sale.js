
import mongoose from 'mongoose';

const ligneVenteSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  nom: { type: String, required: true },
  categorie: { type: String },
  quantite: {
    type: Number,
    required: true,
    min: [1, 'La quantité doit être au moins 1'],
  },
  prixUnitaireHT: {
    type: Number,
    required: true,
    min: 0,
  },
  tauxTVA: {
    type: Number,
    enum: [5.5, 10, 20],
    default: 20,
  },
  remiseLigne: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  sousTotal: { type: Number, required: true },
}, { _id: false });

const saleSchema = new mongoose.Schema(
  {
    numero: {
      type: String,
      unique: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Le client est obligatoire'],
    },
    commercialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lignes: {
      type: [ligneVenteSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'La vente doit contenir au moins une ligne',
      },
    },
    totalHT: { type: Number, required: true, min: 0 },
    remiseGlobale: { type: Number, min: 0, max: 0.5, default: 0 },
    tva: { type: Number, required: true, min: 0 },
    totalTTC: { type: Number, required: true, min: 0 },
    modePaiement: {
      type: String,
      enum: ['CB', 'Virement', 'Especes', 'Cheque'],
      required: true,
    },
    statut: {
      type: String,
      enum: ['en_cours', 'validee', 'annulee'],
      default: 'validee',
    },
  },
  { timestamps: true }
);

// Auto-génération du numéro de vente
saleSchema.pre('save', async function (next) {
  if (!this.numero) {
    const count = await mongoose.model('Sale').countDocuments();
    const year = new Date().getFullYear();
    this.numero = `VTE-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Sale', saleSchema);