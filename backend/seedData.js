import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dns.setServers(['1.1.1.1', '8.8.8.8']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICES_DIR = path.join(__dirname, 'uploads/invoices');
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR, { recursive: true });

// ── Schémas inline ─────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  nom: String, prenom: String,
  email: { type: String, unique: true },
  motDePasse: { type: String, select: false },
  role: String,
  actif: { type: Boolean, default: true },
  tentativesConnexion: { type: Number, default: 0 },
  derniereConnexion: Date,
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const clientSchema = new mongoose.Schema({
  nom: String, prenom: String,
  email: { type: String, unique: true },
  telephone: String, entreprise: String, adresse: String,
  actif: { type: Boolean, default: true },
}, { timestamps: true });
const Client = mongoose.model('Client', clientSchema);

const productSchema = new mongoose.Schema({
  nom: String, categorie: String,
  prixHT: Number, tauxTVA: Number,
  stock: Number, seuilAlerte: Number,
  actif: { type: Boolean, default: true },
  description: String,
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

const ligneVenteSchema = new mongoose.Schema({
  produitId: mongoose.Schema.Types.ObjectId,
  nom: String, categorie: String,
  quantite: Number, prixUnitaireHT: Number,
  tauxTVA: Number, remiseLigne: Number, sousTotal: Number,
}, { _id: false });

const saleSchema = new mongoose.Schema({
  numero: { type: String, unique: true },
  clientId: mongoose.Schema.Types.ObjectId,
  commercialId: mongoose.Schema.Types.ObjectId,
  lignes: [ligneVenteSchema],
  totalHT: Number, remiseGlobale: Number,
  tva: Number, totalTTC: Number,
  modePaiement: String, statut: String,
}, { timestamps: true });
const Sale = mongoose.model('Sale', saleSchema);

const counterSchema = new mongoose.Schema({
  _id: String, seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

const invoiceSchema = new mongoose.Schema({
  numero: { type: String, unique: true },
  venteId: mongoose.Schema.Types.ObjectId,
  clientId: mongoose.Schema.Types.ObjectId,
  commercialId: mongoose.Schema.Types.ObjectId,
  dateEmission: { type: Date, default: Date.now },
  urlPdf: String,
  statut: { type: String, default: 'emise' },
  montants: {
    totalHT: Number, remiseGlobale: Number,
    tva: Number, totalTTC: Number,
  },
}, { timestamps: true });
const Invoice = mongoose.model('Invoice', invoiceSchema);

// ── Génération PDF ─────────────────────────────────────────────
const genPDF = (invoice, vente, client) => new Promise((resolve, reject) => {
  const filePath = path.join(INVOICES_DIR, `${invoice.numero}.pdf`);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Titre
  doc.fontSize(22).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
  doc.fontSize(12).font('Helvetica')
    .moveDown(0.5)
    .text(`N° ${invoice.numero}`, { align: 'right' })
    .text(`Date : ${new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}`, { align: 'right' });

  doc.moveDown()
    .moveTo(50, doc.y).lineTo(545, doc.y)
    .strokeColor('#1F3864').lineWidth(2).stroke().moveDown();

  // Vendeur / Client
  const yTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').text('VENDEUR', 50, yTop)
    .font('Helvetica')
    .text('GV PME SAS', 50)
    .text('SIRET : 000 000 000 00000')
    .text('1 rue de la Paix, 75001 Paris')
    .text('contact@gvpme.fr');

  doc.fontSize(10).font('Helvetica-Bold').text('CLIENT', 300, yTop)
    .font('Helvetica')
    .text(`${client.nom} ${client.prenom}`, 300)
    .text(client.entreprise || '-', 300)
    .text(client.adresse || '-', 300)
    .text(client.email, 300);

  doc.moveDown(2);

  // En-têtes tableau
  const tTop = doc.y;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1F3864')
    .text('Désignation', 50, tTop)
    .text('Qté',         270, tTop)
    .text('P.U. HT',    330, tTop)
    .text('Remise',      400, tTop)
    .text('Sous-total',  460, tTop);

  doc.moveTo(50, tTop + 14).lineTo(545, tTop + 14)
    .strokeColor('#CCCCCC').lineWidth(1).stroke();

  // Lignes
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  let y = tTop + 20;
  for (const ligne of vente.lignes) {
    doc.text(ligne.nom, 50, y, { width: 210 })
      .text(String(ligne.quantite), 270, y)
      .text(`${ligne.prixUnitaireHT.toFixed(2)} €`, 330, y)
      .text(ligne.remiseLigne > 0 ? `${(ligne.remiseLigne * 100).toFixed(0)}%` : '-', 400, y)
      .text(`${ligne.sousTotal.toFixed(2)} €`, 460, y);
    y += 20;
    doc.moveTo(50, y - 4).lineTo(545, y - 4)
      .strokeColor('#EEEEEE').lineWidth(0.5).stroke();
  }

  doc.moveDown(2);

  // Totaux
  const tx = 350;
  doc.fontSize(10).font('Helvetica')
    .text('Total HT :', tx)
    .text(`${vente.totalHT.toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });

  if (vente.remiseGlobale > 0) {
    doc.text(`Remise (${(vente.remiseGlobale * 100).toFixed(0)}%) :`, tx)
      .text(`-${(vente.totalHT * vente.remiseGlobale / (1 - vente.remiseGlobale)).toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });
  }

  doc.text('TVA :', tx)
    .text(`${vente.tva.toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });

  doc.moveTo(tx, doc.y).lineTo(545, doc.y)
    .strokeColor('#1F3864').lineWidth(1).stroke().moveDown(0.3);

  doc.font('Helvetica-Bold').fontSize(12)
    .text('TOTAL TTC :', tx)
    .text(`${vente.totalTTC.toFixed(2)} €`, 480, doc.y - 14, { align: 'right', width: 65 });

  doc.moveDown(2).font('Helvetica').fontSize(10)
    .text(`Mode de paiement : ${vente.modePaiement}`);

  // Mentions légales
  doc.moveDown(3)
    .moveTo(50, doc.y).lineTo(545, doc.y)
    .strokeColor('#CCCCCC').lineWidth(0.5).stroke().moveDown(0.5)
    .fontSize(7).fillColor('#888888')
    .text(
      "Facture émise conformément à l'article L441-3 du Code de commerce. " +
      "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, " +
      "ainsi qu'une indemnité forfaitaire de recouvrement de 40€ (art. L441-6 C.com.).",
      { align: 'justify' }
    );

  doc.end();
  stream.on('finish', () => resolve(filePath));
  stream.on('error', reject);
});

// ── Utilitaires ────────────────────────────────────────────────
const calcTotals = (lignes, remiseGlobale = 0) => {
  let totalHT = 0, totalTVA = 0;
  const lignesCalc = lignes.map(l => {
    const sousTotal = +(l.quantite * l.prixUnitaireHT * (1 - (l.remiseLigne || 0))).toFixed(2);
    const tva = +(sousTotal * (l.tauxTVA / 100)).toFixed(2);
    totalHT += sousTotal;
    totalTVA += tva;
    return { ...l, sousTotal };
  });
  const totalHTApres = +(totalHT * (1 - remiseGlobale)).toFixed(2);
  return {
    lignes: lignesCalc,
    totalHT: totalHTApres,
    tva: +totalTVA.toFixed(2),
    totalTTC: +(totalHTApres + totalTVA).toFixed(2),
  };
};

const randomDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── DONNÉES ────────────────────────────────────────────────────
const utilisateurs = [
  { nom: 'Denis',   prenom: 'Alexandre', email: 'admin@gvpme.fr',       motDePasse: 'Admin1234!', role: 'admin' },
  { nom: 'Dupont',  prenom: 'Marie',     email: 'responsable@gvpme.fr', motDePasse: 'Resp1234!',  role: 'responsable' },
  { nom: 'Durand',  prenom: 'Jean',      email: 'commercial@gvpme.fr',  motDePasse: 'Com1234!',   role: 'commercial' },
  { nom: 'Bernard', prenom: 'Lucie',     email: 'lucie@gvpme.fr',       motDePasse: 'Com1234!',   role: 'commercial' },
  { nom: 'Moreau',  prenom: 'Thomas',    email: 'thomas@gvpme.fr',      motDePasse: 'Com1234!',   role: 'commercial' },
];

const clients = [
  { nom: 'Martin',    prenom: 'Sophie',   email: 'sophie@martin-sa.fr',       telephone: '0612345678', entreprise: 'Martin S.A.',         adresse: '12 rue de la Paix, 75001 Paris' },
  { nom: 'Lefebvre',  prenom: 'Pierre',   email: 'pierre@lefebvre-group.fr',  telephone: '0623456789', entreprise: 'Lefebvre Group',       adresse: '5 avenue Victor Hugo, 69002 Lyon' },
  { nom: 'Garcia',    prenom: 'Maria',    email: 'maria@garcia-tech.fr',      telephone: '0634567890', entreprise: 'Garcia Tech',          adresse: '8 boulevard Michelet, 13008 Marseille' },
  { nom: 'Petit',     prenom: 'François', email: 'francois@petit-distrib.fr', telephone: '0645678901', entreprise: 'Petit Distribution',   adresse: '3 rue du Commerce, 33000 Bordeaux' },
  { nom: 'Rousseau',  prenom: 'Claire',   email: 'claire@rousseau-co.fr',     telephone: '0656789012', entreprise: 'Rousseau & Co',        adresse: '15 place Bellecour, 69002 Lyon' },
  { nom: 'Lambert',   prenom: 'Nicolas',  email: 'nicolas@lambert-pro.fr',    telephone: '0667890123', entreprise: 'Lambert Pro',          adresse: '22 rue nationale, 59000 Lille' },
  { nom: 'Fontaine',  prenom: 'Isabelle', email: 'isabelle@fontaine.fr',      telephone: '0678901234', entreprise: 'Fontaine SARL',        adresse: '7 rue des Fleurs, 31000 Toulouse' },
  { nom: 'Chevalier', prenom: 'David',    email: 'david@chevalier-ind.fr',    telephone: '0689012345', entreprise: 'Chevalier Industrie',  adresse: "18 rue de l'Industrie, 67000 Strasbourg" },
];

const produits = [
  { nom: 'Ordinateur Portable Pro',  categorie: 'Electronique', prixHT: 899,  tauxTVA: 20,  stock: 25,  seuilAlerte: 5,  description: 'Laptop 15 pouces, 16Go RAM, 512Go SSD' },
  { nom: 'Écran 27 pouces 4K',       categorie: 'Electronique', prixHT: 349,  tauxTVA: 20,  stock: 18,  seuilAlerte: 3,  description: 'Moniteur 4K UHD, 60Hz' },
  { nom: 'Clavier Mécanique',        categorie: 'Electronique', prixHT: 129,  tauxTVA: 20,  stock: 3,   seuilAlerte: 5,  description: 'Clavier rétroéclairé RGB' },
  { nom: 'Souris Ergonomique',        categorie: 'Electronique', prixHT: 49,   tauxTVA: 20,  stock: 42,  seuilAlerte: 8,  description: 'Souris sans fil ergonomique' },
  { nom: 'Chaise de Bureau Luxe',    categorie: 'Bureautique',  prixHT: 450,  tauxTVA: 20,  stock: 8,   seuilAlerte: 2,  description: 'Chaise ergonomique réglable' },
  { nom: 'Bureau Réglable',          categorie: 'Bureautique',  prixHT: 699,  tauxTVA: 20,  stock: 6,   seuilAlerte: 2,  description: 'Bureau assis-debout électrique' },
  { nom: 'Ramette Papier A4 (500f)', categorie: 'Bureautique',  prixHT: 4.5,  tauxTVA: 20,  stock: 200, seuilAlerte: 50, description: 'Papier 80g/m²' },
  { nom: 'Stylos Bille (lot 10)',    categorie: 'Bureautique',  prixHT: 3.99, tauxTVA: 20,  stock: 150, seuilAlerte: 30, description: 'Stylos bleus et noirs' },
  { nom: 'Café Grand Cru (1kg)',     categorie: 'Alimentaire',  prixHT: 12.5, tauxTVA: 5.5, stock: 80,  seuilAlerte: 15, description: "Café arabica 100% Éthiopie" },
  { nom: 'Thé Premium (boîte 50)',   categorie: 'Alimentaire',  prixHT: 8.9,  tauxTVA: 5.5, stock: 2,   seuilAlerte: 10, description: 'Sélection de thés premium' },
  { nom: 'Casque Audio Bluetooth',   categorie: 'Electronique', prixHT: 189,  tauxTVA: 20,  stock: 15,  seuilAlerte: 4,  description: 'Casque sans fil réduction de bruit' },
  { nom: 'Webcam HD 1080p',          categorie: 'Electronique', prixHT: 79,   tauxTVA: 20,  stock: 22,  seuilAlerte: 5,  description: 'Webcam Full HD avec micro intégré' },
];

const modesPaiement = ['CB', 'Virement', 'Especes', 'Cheque'];

// ── SEED PRINCIPAL ─────────────────────────────────────────────
async function seed() {
  try {
    console.log('🔗 Connexion à MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté\n');

    // Nettoyage
    console.log('🗑️  Nettoyage des anciennes données...');
    await Promise.all([
      User.deleteMany({}),
      Client.deleteMany({}),
      Product.deleteMany({}),
      Sale.deleteMany({}),
      Invoice.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    // Supprimer les anciens PDFs
    if (fs.existsSync(INVOICES_DIR)) {
      fs.readdirSync(INVOICES_DIR)
        .filter(f => f.endsWith('.pdf'))
        .forEach(f => fs.unlinkSync(path.join(INVOICES_DIR, f)));
    }
    console.log('✅ Collections vidées\n');

    // ── Utilisateurs ────────────────────────────────────────
    console.log('👥 Création des utilisateurs...');
    const usersCreated = [];
    for (const u of utilisateurs) {
      const hash = await bcrypt.hash(u.motDePasse, 12);
      const user = await User.create({ ...u, motDePasse: hash });
      usersCreated.push(user);
      console.log(`   ✅ ${u.role.padEnd(12)} → ${u.email}`);
    }
    const commerciaux = usersCreated.filter(u => u.role === 'commercial');

    // ── Clients ─────────────────────────────────────────────
    console.log('\n🏢 Création des clients...');
    const clientsCreated = [];
    for (const c of clients) {
      const client = await Client.create(c);
      clientsCreated.push(client);
      console.log(`   ✅ ${c.entreprise}`);
    }

    // ── Produits ────────────────────────────────────────────
    console.log('\n📦 Création des produits...');
    const produitsCreated = [];
    for (const p of produits) {
      const produit = await Product.create(p);
      produitsCreated.push(produit);
      console.log(`   ✅ ${p.nom} — ${p.prixHT}€ HT — Stock: ${p.stock}`);
    }

    // ── Ventes (30 ventes sur 90 jours) ─────────────────────
    console.log('\n🛒 Création des ventes + factures PDF...');
    let venteCount = 0;
    let factureCount = 0;

    for (let i = 1; i <= 30; i++) {
      const client     = randomItem(clientsCreated);
      const commercial = randomItem(commerciaux);
      const nbLignes   = Math.floor(Math.random() * 3) + 1;
      const lignes     = [];
      const produitsChoisis = [...produitsCreated]
        .sort(() => Math.random() - 0.5)
        .slice(0, nbLignes);

      for (const p of produitsChoisis) {
        const quantite = Math.floor(Math.random() * 5) + 1;
        lignes.push({
          produitId:      p._id,
          nom:            p.nom,
          categorie:      p.categorie,
          quantite,
          prixUnitaireHT: p.prixHT,
          tauxTVA:        p.tauxTVA,
          remiseLigne:    Math.random() > 0.7 ? 0.05 : 0,
          sousTotal:      0,
        });
      }

      const remiseGlobale = Math.random() > 0.8 ? 0.1 : 0;
      const totaux        = calcTotals(lignes, remiseGlobale);
      const dateVente     = randomDate(90);
      const modePaiement  = randomItem(modesPaiement);

      venteCount++;
      const vente = await Sale.create({
        numero:       `VTE-2026-${String(venteCount).padStart(5, '0')}`,
        clientId:     client._id,
        commercialId: commercial._id,
        lignes:       totaux.lignes,
        totalHT:      totaux.totalHT,
        remiseGlobale,
        tva:          totaux.tva,
        totalTTC:     totaux.totalTTC,
        modePaiement,
        statut:       'validee',
        createdAt:    dateVente,
        updatedAt:    dateVente,
      });

      // Facture
      factureCount++;
      const counter = await Counter.findByIdAndUpdate(
        'facture_2026',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const invoiceNum = `FAC-2026-${String(counter.seq).padStart(5, '0')}`;

      const invoice = await Invoice.create({
        numero:       invoiceNum,
        venteId:      vente._id,
        clientId:     client._id,
        commercialId: commercial._id,
        dateEmission: dateVente,
        statut:       'emise',
        montants: {
          totalHT:       totaux.totalHT,
          remiseGlobale,
          tva:           totaux.tva,
          totalTTC:      totaux.totalTTC,
        },
      });

      // Générer le PDF
      try {
        await genPDF(
          invoice,
          {
            lignes:       totaux.lignes,
            totalHT:      totaux.totalHT,
            tva:          totaux.tva,
            totalTTC:     totaux.totalTTC,
            remiseGlobale,
            modePaiement,
          },
          client
        );
        invoice.urlPdf = `/api/invoices/download/${invoice._id}`;
        await invoice.save();
        console.log(`   ✅ ${vente.numero} — ${totaux.totalTTC.toFixed(2)}€ TTC — ${invoiceNum} PDF ✓`);
      } catch (pdfErr) {
        console.error(`   ⚠️  PDF non généré pour ${invoiceNum}: ${pdfErr.message}`);
      }
    }

    // ── Résumé ───────────────────────────────────────────────
    console.log('\n🎉 Seed terminé avec succès !\n');
    console.log('📊 Résumé :');
    console.log(`   👥 ${usersCreated.length} utilisateurs`);
    console.log(`   🏢 ${clientsCreated.length} clients`);
    console.log(`   📦 ${produitsCreated.length} produits`);
    console.log(`   🛒 ${venteCount} ventes`);
    console.log(`   🧾 ${factureCount} factures + PDFs`);

    console.log('\n📋 Comptes disponibles :');
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log('│ Rôle          Email                   Mot de passe       │');
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log('│ admin         admin@gvpme.fr           Admin1234!        │');
    console.log('│ responsable   responsable@gvpme.fr     Resp1234!         │');
    console.log('│ commercial    commercial@gvpme.fr      Com1234!          │');
    console.log('│ commercial    lucie@gvpme.fr           Com1234!          │');
    console.log('│ commercial    thomas@gvpme.fr          Com1234!          │');
    console.log('└──────────────────────────────────────────────────────────┘');

  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB.');
    process.exit(0);
  }
}

seed();