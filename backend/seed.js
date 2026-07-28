

import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dns.setServers(['1.1.1.1', '8.8.8.8']);

const userSchema = new mongoose.Schema(
  {
    nom:                  { type: String, required: true },
    prenom:               { type: String, required: true },
    email:                { type: String, required: true, unique: true, lowercase: true },
    motDePasse:           { type: String, required: true, select: false },
    role:                 { type: String, enum: ['admin', 'responsable', 'commercial'], default: 'commercial' },
    actif:                { type: Boolean, default: true },
    derniereConnexion:    { type: Date },
    tentativesConnexion:  { type: Number, default: 0 },
    bloquéJusquA:         { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const utilisateurs = [
  {
    nom:       'Denis',
    prenom:    'Alexandre',
    email:     'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role:      'admin',
  },
  {
    nom:       'Dupont',
    prenom:    'Marie',
    email:     'responsable@gvpme.fr',
    motDePasse: 'Resp1234!',
    role:      'responsable',
  },
  {
    nom:       'Durand',
    prenom:    'Jean',
    email:     'commercial@gvpme.fr',
    motDePasse: 'Com1234!',
    role:      'commercial',
  },
];

// ── Connexion et seed ─────────────────────────────────────────
async function seed() {
  try {
    console.log(' Connexion à MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' MongoDB connecté\n');

    
    await User.deleteMany({
      email: { $in: utilisateurs.map(u => u.email) }
    });
    console.log('  Anciens utilisateurs de test supprimés\n');

   
    for (const u of utilisateurs) {
      const hash = await bcrypt.hash(u.motDePasse, 12);
      await User.create({ ...u, motDePasse: hash });
      console.log(`✅ Créé : ${u.role.padEnd(12)} → ${u.email}  (mdp: ${u.motDePasse})`);
    }

    console.log('\n Seed terminé ! Utilisateurs prêts à l\'utilisation.');
    console.log('\n Récapitulatif des comptes :');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ Rôle          Email                  Mot de passe   │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ admin         admin@gvpme.fr          Admin1234!    │');
    console.log('│ responsable   responsable@gvpme.fr    Resp1234!     │');
    console.log('│ commercial    commercial@gvpme.fr     Com1234!      │');
    console.log('└─────────────────────────────────────────────────────┘');

  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion MongoDB fermée.');
    process.exit(0);
  }
}

seed();