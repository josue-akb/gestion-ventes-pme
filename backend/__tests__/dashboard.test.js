import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Client from '../src/models/Client.js';
import Sale from '../src/models/Sale.js';

let mongod;
const ctx = {
  adminToken: null,
  commercialToken: null,
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Créer admin
  await User.create({
    nom: 'Denis', prenom: 'Alexandre',
    email: 'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role: 'admin', actif: true,
  });

  // Créer commercial
  const commercial = await User.create({
    nom: 'Durand', prenom: 'Jean',
    email: 'commercial@gvpme.fr',
    motDePasse: 'Com1234!',
    role: 'commercial', actif: true,
  });

  // Login admin
  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });
  ctx.adminToken = resAdmin.body.accessToken;

  // Login commercial
  const resCom = await request(app)
    .post('/api/auth/login')
    .send({ email: 'commercial@gvpme.fr', motDePasse: 'Com1234!' });
  ctx.commercialToken = resCom.body.accessToken;

  // Créer des données de test
  const client = await Client.create({
    nom: 'Martin', prenom: 'Sophie',
    email: 'sophie@test.fr', actif: true,
  });

  const produit = await Product.create({
    nom: 'Produit Alpha', categorie: 'Electronique',
    prixHT: 100, tauxTVA: 20,
    stock: 50, seuilAlerte: 5, actif: true,
  });

  // Créer 3 ventes de test
  await Sale.create([
    {
      numero: 'VTE-2026-00001',
      clientId: client._id,
      commercialId: commercial._id,
      lignes: [{
        produitId: produit._id,
        nom: produit.nom,
        categorie: produit.categorie,
        quantite: 2,
        prixUnitaireHT: 100,
        tauxTVA: 20,
        remiseLigne: 0,
        sousTotal: 200,
      }],
      totalHT: 200, remiseGlobale: 0,
      tva: 40, totalTTC: 240,
      modePaiement: 'CB', statut: 'validee',
    },
    {
      numero: 'VTE-2026-00002',
      clientId: client._id,
      commercialId: commercial._id,
      lignes: [{
        produitId: produit._id,
        nom: produit.nom,
        categorie: produit.categorie,
        quantite: 1,
        prixUnitaireHT: 100,
        tauxTVA: 20,
        remiseLigne: 0,
        sousTotal: 100,
      }],
      totalHT: 100, remiseGlobale: 0,
      tva: 20, totalTTC: 120,
      modePaiement: 'Virement', statut: 'validee',
    },
  ]);

  // Produit avec stock bas
  await Product.create({
    nom: 'Produit Stock Bas', categorie: 'Test',
    prixHT: 50, tauxTVA: 20,
    stock: 2, seuilAlerte: 5, actif: true,
  });

}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

describe('Dashboard — GET /api/dashboard', () => {

  test(' Dashboard accessible admin → 200', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('evolutionCA');
    expect(res.body).toHaveProperty('topProduits');
    expect(res.body).toHaveProperty('topClients');
    expect(res.body).toHaveProperty('performancesCommerciaux');
  }, 15000);

  test(' KPIs corrects', async () => {
    const res = await request(app)
      .get('/api/dashboard?periode=mois')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.kpis.nbVentes).toBe(2);
    expect(res.body.kpis.totalCA).toBe(360);
    expect(res.body.kpis.panierMoyen).toBe(180);
    expect(res.body.kpis.stockAlertes).toBe(1);
  }, 15000);

  test(' Top produits présent', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.body.topProduits.length).toBeGreaterThan(0);
    expect(res.body.topProduits[0]).toHaveProperty('nom');
    expect(res.body.topProduits[0]).toHaveProperty('totalCA');
  }, 15000);

  test(' Performances commerciaux présentes', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.body.performancesCommerciaux.length).toBeGreaterThan(0);
    expect(res.body.performancesCommerciaux[0]).toHaveProperty('nom');
    expect(res.body.performancesCommerciaux[0]).toHaveProperty('totalCA');
  }, 15000);

  test(' Commercial non autorisé → 403', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ctx.commercialToken}`);

    expect(res.statusCode).toBe(403);
  }, 10000);

  test(' Sans token → 401', async () => {
    const res = await request(app)
      .get('/api/dashboard');

    expect(res.statusCode).toBe(401);
  });

  test(' Filtre période semaine → 200', async () => {
    const res = await request(app)
      .get('/api/dashboard?periode=semaine')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.periode).toBe('semaine');
  }, 15000);

});

describe('Dashboard — GET /api/dashboard/stats/ventes', () => {

  test(' Stats ventes → 200', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats/ventes')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('stats');
  }, 15000);

});