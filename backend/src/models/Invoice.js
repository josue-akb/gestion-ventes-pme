import mongoose from 'mongoose';

// Compteur séquentiel atomique pour les numéros de facture
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

const invoiceSchema = new mongoose.Schema(
  {
    numero: {
      type: String,
      unique: true,
    },
    venteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      unique: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    commercialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dateEmission: {
      type: Date,
      default: Date.now,
    },
    urlPdf: {
      type: String,
    },
    statut: {
      type: String,
      enum: ['emise', 'payee', 'annulee'],
      default: 'emise',
    },
    montants: {
      totalHT:       { type: Number, required: true },
      remiseGlobale: { type: Number, default: 0 },
      tva:           { type: Number, required: true },
      totalTTC:      { type: Number, required: true },
    },
  },
  { timestamps: true }
);

// Numérotation séquentielle atomique
invoiceSchema.pre('save', async function (next) {
  if (!this.numero) {
    const year = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      `facture_${year}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.numero = `FAC-${year}-${String(counter.seq).padStart(5, '0')}`;
  }
  next();
});

export { Counter };
export default mongoose.model('Invoice', invoiceSchema);