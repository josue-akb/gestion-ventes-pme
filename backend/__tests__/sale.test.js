import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Client from '../src/models/Client.js';

let mongod;
let adminToken;
let clientId;
let productId;
let saleId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await User.create({
    nom: 'Denis', prenom: 'Alexandre',
    email: 'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role: 'admin', actif: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });
  adminToken = loginRes.body.accessToken;

  const client = await Client.create({
    nom: 'Martin', prenom: 'Sophie',
    email: 'sophie@test.fr', actif: true,
  });
  clientId = client._id.toString();

  const product = await Product.create({
    nom: 'Produit Alpha', categorie: 'Electronique',
    prixHT: 100, tauxTVA: 20,
    stock: 50, seuilAlerte: 5, actif: true,
  });
  productId = product._id.toString();

  console.log('Setup OK — clientId:', clientId, 'productId:', productId);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

describe('Sales — POST /api/sales', () => {

  test(' Créer une vente valide → 201', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId,
        lignes: [{ produitId, quantite: 2, remiseLigne: 0 }],
        remiseGlobale: 0,
        modePaiement: 'CB',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.sale).toHaveProperty('numero');
    expect(res.body.sale.totalTTC).toBe(240);
    saleId = res.body.sale._id;
  }, 15000);

  test(' Stock décrémenté après vente', async () => {
    const product = await Product.findById(productId);
    expect(product.stock).toBe(48);
  }, 10000);

  test(' Vente avec remise ligne 10%', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId,
        lignes: [{ produitId, quantite: 1, remiseLigne: 0.1 }],
        remiseGlobale: 0,
        modePaiement: 'Virement',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.sale.totalTTC).toBe(108);
  }, 15000);

  test(' Stock insuffisant → 400', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId,
        lignes: [{ produitId, quantite: 9999 }],
        modePaiement: 'CB',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/stock insuffisant/i);
  }, 10000);

  test(' Client inexistant → 404', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId: '000000000000000000000000',
        lignes: [{ produitId, quantite: 1 }],
        modePaiement: 'CB',
      });

    expect(res.statusCode).toBe(404);
  }, 10000);

  test(' Lignes vides → 400', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, lignes: [], modePaiement: 'CB' });

    expect(res.statusCode).toBe(400);
  }, 10000);

  test(' Sans token → 401', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({
        clientId,
        lignes: [{ produitId, quantite: 1 }],
        modePaiement: 'CB',
      });

    expect(res.statusCode).toBe(401);
  });

});

describe('Sales — GET /api/sales', () => {

  test(' Lister les ventes → 200', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('sales');
    expect(res.body.sales.length).toBeGreaterThan(0);
  }, 10000);

  test(' Récupérer une vente par ID → 200', async () => {
    const res = await request(app)
      .get(`/api/sales/${saleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(saleId);
  }, 10000);

  test(' ID inexistant → 404', async () => {
    const res = await request(app)
      .get('/api/sales/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  }, 10000);

});