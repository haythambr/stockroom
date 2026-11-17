import { Role } from '@prisma/client';
import { bearer, createApp, makeUser, resetDb, TestContext } from './helpers';

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.app.close());

  const register = (email = 'sam@example.com') =>
    ctx
      .http()
      .post('/auth/register')
      .send({ name: 'Sam Carter', email, password: 'correct-horse-battery' });

  it('signs up, then reads the profile with the access token', async () => {
    const { body } = await register('  SAM@Example.com ').expect(201);

    expect(body.user).toMatchObject({
      email: 'sam@example.com',
      role: 'CUSTOMER',
    });
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.expiresIn).toBe(900);

    await ctx
      .http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200)
      .expect((r) => {
        expect(r.body.email).toBe('sam@example.com');
      });
  });

  it('refuses a second account with the same email', async () => {
    await register().expect(201);
    await register().expect(409);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    await register().expect(201);

    const wrongPassword = await ctx
      .http()
      .post('/auth/login')
      .send({ email: 'sam@example.com', password: 'nope-nope-nope' })
      .expect(401);
    const unknownEmail = await ctx
      .http()
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'nope-nope-nope' })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('rotates refresh tokens, and a reused one signs that login out everywhere', async () => {
    const first = (await register().expect(201)).body;

    const second = (
      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200)
    ).body;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // Someone replays the first (already used) token: it fails, and so does the legitimate new one.
    const reuse = await ctx
      .http()
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    expect(reuse.body.message).toMatch(/already used/);
    await ctx
      .http()
      .post('/auth/refresh')
      .send({ refreshToken: second.refreshToken })
      .expect(401);
  });

  it('only one of two simultaneous refreshes with the same token succeeds', async () => {
    const { refreshToken } = (await register().expect(201)).body;

    const results = await Promise.all([
      ctx.http().post('/auth/refresh').send({ refreshToken }),
      ctx.http().post('/auth/refresh').send({ refreshToken }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it('logs out by revoking the refresh token', async () => {
    const { refreshToken } = (await register().expect(201)).body;

    await ctx.http().post('/auth/logout').send({ refreshToken }).expect(204);
    await ctx.http().post('/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('requires a valid access token on protected routes', async () => {
    await ctx.http().get('/cart').expect(401);
    await ctx
      .http()
      .get('/cart')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('keeps customers out of admin routes', async () => {
    const customer = await makeUser(ctx.prisma, Role.CUSTOMER);
    const admin = await makeUser(ctx.prisma, Role.ADMIN);

    await ctx
      .http()
      .get('/admin/orders')
      .set('Authorization', bearer(ctx.app, customer))
      .expect(403);
    await ctx
      .http()
      .get('/admin/orders')
      .set('Authorization', bearer(ctx.app, admin))
      .expect(200);
  });

  it('validates input and rejects unknown fields', async () => {
    const short = await ctx
      .http()
      .post('/auth/register')
      .send({ name: 'S', email: 'x', password: '123' })
      .expect(400);
    expect(short.body.message).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/email/),
        expect.stringMatching(/password/),
      ]),
    );

    await ctx
      .http()
      .post('/auth/register')
      .send({
        name: 'Sam',
        email: 'sam@example.com',
        password: 'long-enough-pass',
        role: 'ADMIN',
      })
      .expect(400);
  });
});
