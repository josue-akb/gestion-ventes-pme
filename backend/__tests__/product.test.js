// backend/__tests__/product.test.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';

let mongod;
let adminToken;
let productId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Créer admin de test
  await User.create({
    nom: 'Denis', prenom: 'Alexandre',
    email: 'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role: 'admin', actif: true,
  });

  // Login pour récupérer le token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

  adminToken = res.body.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

describe('Products — POST /api/products', () => {

  test(' Créer un produit valide → 201', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Produit Alpha',
        categorie: 'Electronique',
        prixHT: 120,
        tauxTVA: 20,
        stock: 48,
        seuilAlerte: 5,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.nom).toBe('Produit Alpha');
    expect(res.body.prixHT).toBe(120);
    productId = res.body._id;
  }, 10000);

  test(' Champ nom manquant → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categorie: 'Electronique', prixHT: 120 });

    expect(res.statusCode).toBe(400);
  });

  test(' Prix négatif → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Test', categorie: 'Test',
        prixHT: -10, tauxTVA: 20,
      });

    expect(res.statusCode).toBe(400);
  });

  test(' Sans token → 401', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ nom: 'Test', categorie: 'Test', prixHT: 10 });

    expect(res.statusCode).toBe(401);
  });

});

describe('Products — GET /api/products', () => {

  test(' Lister les produits → 200', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.products.length).toBeGreaterThan(0);
  }, 10000);

  test(' Récupérer un produit par ID → 200', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(productId);
  }, 10000);

  test('❌ ID inexistant → 404', async () => {
    const res = await request(app)
      .get('/api/products/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  }, 10000);

});

describe('Products — PUT /api/products/:id', () => {

  test(' Modifier un produit → 200', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 100, prixHT: 150 });

    expect(res.statusCode).toBe(200);
    expect(res.body.stock).toBe(100);
    expect(res.body.prixHT).toBe(150);
  }, 10000);

  test('❌ Body vide → 400', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  }, 10000);

});

describe('Products — DELETE /api/products/:id', () => {

  test(' Désactiver un produit → 200', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.product.actif).toBe(false);
  }, 10000);

});

describe('Products — Alertes stock', () => {

  test(' Récupérer les alertes stock bas → 200', async () => {
    // Créer un produit avec stock bas
    await Product.create({
      nom: 'Produit Stock Bas',
      categorie: 'Test',
      prixHT: 50,
      tauxTVA: 20,
      stock: 2,
      seuilAlerte: 5,
    });

    const res = await request(app)
      .get('/api/products/alertes/stock-bas')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  }, 10000);

});