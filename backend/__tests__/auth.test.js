// backend/__tests__/auth.test.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  
  await User.create({
    nom: 'Denis',
    prenom: 'Alexandre',
    email: 'admin@gvpme.fr',
    motDePasse: 'Admin1234!',
    role: 'admin',
    actif: true,
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

describe('Auth — POST /api/auth/login', () => {

  test(' Login réussi avec credentials valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.role).toBe('admin');
  }, 10000);

  test(' Email manquant → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test(' Mot de passe manquant → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr' });

    expect(res.statusCode).toBe(400);
  });

  test(' Mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'mauvaismdp' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  }, 10000);

  test(' Email inexistant → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inexistant@test.fr', motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(401);
  }, 10000);

});

describe('Auth — POST /api/auth/logout', () => {

  test(' Logout réussi avec token valide', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

    const token = login.body.accessToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/déconnexion/i);
  }, 10000);

  test(' Logout sans token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.statusCode).toBe(401);
  });

});