import { Role } from '@prisma/client';
import {
  bearer,
  createApp,
  makeProduct,
  makeUser,
  resetDb,
  TestContext,
} from './helpers';

describe('Catalog (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.app.close());

  it('pages through products with meta', async () => {
    for (let i = 0; i < 5; i++) {
      await makeProduct(ctx.prisma);
    }

    const { body } = await ctx
      .http()
      .get('/products?page=2&limit=2')
      .expect(200);

    expect(body.data).toHaveLength(2);
    expect(body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('filters by category, price, stock and search, and sorts by price', async () => {
    await makeProduct(ctx.prisma, {
      name: 'Stoneware mug',
      priceCents: 1800,
      category: 'kitchen',
    });
    await makeProduct(ctx.prisma, {
      name: 'Oak board',
      priceCents: 3500,
      category: 'kitchen',
    });
    await makeProduct(ctx.prisma, {
      name: 'Sold-out kettle',
      priceCents: 4000,
      stock: 0,
      category: 'kitchen',
    });
    await makeProduct(ctx.prisma, {
      name: 'Canvas tote',
      priceCents: 2000,
      category: 'bags',
    });

    const names = async (query: string) =>
      (await ctx.http().get(`/products?${query}`).expect(200)).body.data.map(
        (p: { name: string }) => p.name,
      );

    expect(await names('category=kitchen&sort=price')).toEqual([
      'Stoneware mug',
      'Oak board',
      'Sold-out kettle',
    ]);
    expect(await names('category=kitchen&inStock=true&sort=-price')).toEqual([
      'Oak board',
      'Stoneware mug',
    ]);
    expect(
      await names('minPriceCents=1900&maxPriceCents=3600&sort=price'),
    ).toEqual(['Canvas tote', 'Oak board']);
    expect(await names('search=MUG')).toEqual(['Stoneware mug']);
  });

  it('hides products that are switched off', async () => {
    const hidden = await makeProduct(ctx.prisma, { isActive: false });

    expect(
      (await ctx.http().get('/products').expect(200)).body.meta.total,
    ).toBe(0);
    await ctx.http().get(`/products/${hidden.slug}`).expect(404);
  });

  it('finds one product by slug or id', async () => {
    const product = await makeProduct(ctx.prisma, { name: 'Brass lamp' });

    await ctx
      .http()
      .get(`/products/${product.slug}`)
      .expect(200)
      .expect((r) => expect(r.body.name).toBe('Brass lamp'));
    await ctx.http().get(`/products/${product.id}`).expect(200);
  });

  it('rejects unknown sort values and silly page sizes', async () => {
    await ctx.http().get('/products?sort=random').expect(400);
    await ctx.http().get('/products?limit=1000').expect(400);
  });

  describe('admin', () => {
    it('creates a product and logs the opening stock', async () => {
      const admin = await makeUser(ctx.prisma, Role.ADMIN);
      const category = await ctx.prisma.category.create({
        data: { slug: 'kitchen', name: 'Kitchen' },
      });

      const { body } = await ctx
        .http()
        .post('/admin/products')
        .set('Authorization', bearer(ctx.app, admin))
        .send({
          sku: 'MUG-01',
          name: 'Mug',
          slug: 'mug',
          description: 'A mug.',
          priceCents: 1800,
          stock: 12,
          categoryId: category.id,
        })
        .expect(201);

      const movements = await ctx.prisma.stockMovement.findMany({
        where: { productId: body.id },
      });
      expect(movements).toEqual([
        expect.objectContaining({ change: 12, reason: 'RESTOCK' }),
      ]);

      await ctx
        .http()
        .post('/admin/products')
        .set('Authorization', bearer(ctx.app, admin))
        .send({
          sku: 'MUG-01',
          name: 'Mug 2',
          slug: 'mug-2',
          description: 'A mug.',
          priceCents: 1800,
          stock: 1,
          categoryId: category.id,
        })
        .expect(409);
    });

    it('adjusts stock but never below zero, and only through the stock endpoint', async () => {
      const admin = await makeUser(ctx.prisma, Role.ADMIN);
      const product = await makeProduct(ctx.prisma, { stock: 3 });
      const auth = bearer(ctx.app, admin);

      await ctx
        .http()
        .post(`/admin/products/${product.id}/stock`)
        .set('Authorization', auth)
        .send({ change: 5, note: 'Delivery' })
        .expect(201);
      const tooMany = await ctx
        .http()
        .post(`/admin/products/${product.id}/stock`)
        .set('Authorization', auth)
        .send({ change: -9 })
        .expect(409);
      expect(tooMany.body.message).toBe(
        "Only 8 in stock, so 9 can't be removed.",
      );

      await ctx
        .http()
        .patch(`/admin/products/${product.id}`)
        .set('Authorization', auth)
        .send({ stock: 100 })
        .expect(409);
      expect(
        (
          await ctx.prisma.product.findUniqueOrThrow({
            where: { id: product.id },
          })
        ).stock,
      ).toBe(8);
    });
  });
});
