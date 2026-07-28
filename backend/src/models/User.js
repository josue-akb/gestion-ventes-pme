
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
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
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'responsable', 'commercial'],
      default: 'commercial',
    },
    actif: {
      type: Boolean,
      default: true,
    },
    derniereConnexion: {
      type: Date,
    },
    tentativesConnexion: {
      type: Number,
      default: 0,
    },
    bloquéJusquA: {
      type: Date,
    },
  },
  { timestamps: true }
);


userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});


userSchema.methods.comparerMotDePasse = async function (motDePasseSaisi) {
  return bcrypt.compare(motDePasseSaisi, this.motDePasse);
};


userSchema.methods.estBloque = function () {
  return this.bloquéJusquA && this.bloquéJusquA > Date.now();
};

export default mongoose.model('User', userSchema);