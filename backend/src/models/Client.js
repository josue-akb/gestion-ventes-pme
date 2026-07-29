
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est obligatoire'],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est obligatoire'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    telephone: {
      type: String,
      trim: true,
    },
    entreprise: {
      type: String,
      trim: true,
    },
    adresse: {
      type: String,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

clientSchema.index({ nom: 'text', prenom: 'text', email: 'text', entreprise: 'text' });

export default mongoose.model('Client', clientSchema);