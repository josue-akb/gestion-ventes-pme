
import request from 'supertest';
import app from '../src/app.js';

describe('Auth — POST /api/auth/login', () => {

  test('✅ Login réussi avec credentials valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.role).toBe('admin');
  });

  test('❌ Email manquant → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test('❌ Mot de passe manquant → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr' });

    expect(res.statusCode).toBe(400);
  });

  test('❌ Mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'mauvaismdp' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  });

  test('❌ Email inexistant → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inexistant@test.fr', motDePasse: 'Admin1234!' });

    expect(res.statusCode).toBe(401);
  });

});

describe('Auth — POST /api/auth/logout', () => {

  test('✅ Logout réussi avec token valide', async () => {
    
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gvpme.fr', motDePasse: 'Admin1234!' });

    const token = login.body.accessToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/déconnexion/i);
  });

  test('❌ Logout sans token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.statusCode).toBe(401);
  });

});