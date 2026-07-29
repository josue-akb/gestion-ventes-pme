// backend/__tests__/client.test.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

let mongod;
let adminToken;
let clientId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await User.create({
    nom: 'Denis', prenom: 'Alexandre',
    email: 'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role: 'admin', actif: true,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

  adminToken = res.body.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

describe('Clients — POST /api/clients', () => {

  test(' Créer un client valide → 201', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@entreprise.fr',
        telephone: '0612345678',
        entreprise: 'Martin S.A.',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe('sophie.martin@entreprise.fr');
    clientId = res.body._id;
  }, 10000);

  test(' Email dupliqué → 409', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@entreprise.fr',
      });

    expect(res.statusCode).toBe(409);
  }, 10000);

  test(' Email invalide → 400', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Test', prenom: 'Test', email: 'pasunemail' });

    expect(res.statusCode).toBe(400);
  });

  test(' Sans token → 401', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ nom: 'Test', prenom: 'Test', email: 'test@test.fr' });

    expect(res.statusCode).toBe(401);
  });

});

describe('Clients — GET /api/clients', () => {

  test(' Lister les clients → 200', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('clients');
    expect(res.body.clients.length).toBeGreaterThan(0);
  }, 10000);

  test(' Récupérer un client par ID → 200', async () => {
    const res = await request(app)
      .get(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(clientId);
  }, 10000);

  test(' Historique client → 200', async () => {
    const res = await request(app)
      .get(`/api/clients/${clientId}/historique`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('historique');
  }, 10000);

  test(' ID inexistant → 404', async () => {
    const res = await request(app)
      .get('/api/clients/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  }, 10000);

});

describe('Clients — PUT /api/clients/:id', () => {

  test(' Modifier un client → 200', async () => {
    const res = await request(app)
      .put(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ telephone: '0698765432', entreprise: 'Martin Group' });

    expect(res.statusCode).toBe(200);
    expect(res.body.telephone).toBe('0698765432');
  }, 10000);

  test(' Body vide → 400', async () => {
    const res = await request(app)
      .put(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  }, 10000);

});

describe('Clients — DELETE /api/clients/:id', () => {

  test(' Désactiver un client → 200', async () => {
    const res = await request(app)
      .delete(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.client.actif).toBe(false);
  }, 10000);

});