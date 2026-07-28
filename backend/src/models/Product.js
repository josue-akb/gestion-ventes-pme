
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du produit est obligatoire'],
      trim: true,
    },
    categorie: {
      type: String,
      required: [true, 'La catégorie est obligatoire'],
      trim: true,
    },
    prixHT: {
      type: Number,
      required: [true, 'Le prix HT est obligatoire'],
      min: [0, 'Le prix ne peut pas être négatif'],
    },
    tauxTVA: {
      type: Number,
      enum: [5.5, 10, 20],
      default: 20,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Le stock ne peut pas être négatif'],
      default: 0,
    },
    seuilAlerte: {
      type: Number,
      default: 5,
      min: 0,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Méthode : est en rupture ?
productSchema.methods.estEnRupture = function () {
  return this.stock <= 0;
};

// Méthode : stock bas ?
productSchema.methods.stockBas = function () {
  return this.stock > 0 && this.stock <= this.seuilAlerte;
};

// Virtuel : prix TTC
productSchema.virtual('prixTTC').get(function () {
  return +(this.prixHT * (1 + this.tauxTVA / 100)).toFixed(2);
});

// Index pour la recherche
productSchema.index({ nom: 'text', categorie: 'text' });

export default mongoose.model('Product', productSchema);