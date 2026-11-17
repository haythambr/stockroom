import { OrderStatus, Role } from '@prisma/client';
import { OrdersService } from '../src/orders/orders.service';
import {
  address,
  bearer,
  createApp,
  makeProduct,
  makeUser,
  placeOrder,
  resetDb,
  TestContext,
} from './helpers';

describe('Cart and orders (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.app.close());

  const stockOf = async (id: string) =>
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  it('checks out the cart: copies prices, adds shipping, takes stock and empties the cart', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    const mug = await makeProduct(ctx.prisma, { priceCents: 1800, stock: 10 });
    const tote = await makeProduct(ctx.prisma, { priceCents: 450, stock: 5 });

    const { body: order } = await placeOrder(ctx, auth, [
      [mug, 2],
      [tote, 1],
    ]).then((r) => r);

    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      subtotalCents: 4050,
      shippingCents: 499,
      totalCents: 4549,
    });
    expect(order.items).toHaveLength(2);
    expect(await stockOf(mug.id)).toBe(8);
    expect(await stockOf(tote.id)).toBe(4);
    expect(
      (await ctx.http().get('/cart').set('Authorization', auth).expect(200))
        .body.items,
    ).toEqual([]);

    // Later price changes don't touch the order.
    await ctx.prisma.product.update({
      where: { id: mug.id },
      data: { priceCents: 9900 },
    });
    const again = await ctx
      .http()
      .get(`/orders/${order.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(again.body.totalCents).toBe(4549);
  });

  it('refuses to put more in the cart than is in stock', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    const lamp = await makeProduct(ctx.prisma, { stock: 2 });

    const { body } = await ctx
      .http()
      .put(`/cart/items/${lamp.id}`)
      .set('Authorization', auth)
      .send({ quantity: 3 })
      .expect(400);
    expect(body.message).toMatch(/Only 2/);
  });

  it('refuses to check out an empty cart', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));

    await ctx
      .http()
      .post('/orders')
      .set('Authorization', auth)
      .send({ shippingAddress: address })
      .expect(400);
  });

  it('never oversells: two customers buying the last unit at the same moment', async () => {
    const last = await makeProduct(ctx.prisma, { stock: 1 });
    const alice = bearer(ctx.app, await makeUser(ctx.prisma));
    const bob = bearer(ctx.app, await makeUser(ctx.prisma));

    for (const auth of [alice, bob]) {
      await ctx
        .http()
        .put(`/cart/items/${last.id}`)
        .set('Authorization', auth)
        .send({ quantity: 1 })
        .expect(200);
    }

    const results = await Promise.all([
      ctx
        .http()
        .post('/orders')
        .set('Authorization', alice)
        .send({ shippingAddress: address }),
      ctx
        .http()
        .post('/orders')
        .set('Authorization', bob)
        .send({ shippingAddress: address }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body).toMatchObject({
      available: 0,
    });
    expect(await stockOf(last.id)).toBe(0);
    expect(await ctx.prisma.order.count()).toBe(1);
  });

  it('saves nothing when one item in the cart sold out meanwhile', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    const plenty = await makeProduct(ctx.prisma, { stock: 10 });
    const scarce = await makeProduct(ctx.prisma, { stock: 2 });

    for (const [p, q] of [
      [plenty, 1],
      [scarce, 2],
    ] as const) {
      await ctx
        .http()
        .put(`/cart/items/${p.id}`)
        .set('Authorization', auth)
        .send({ quantity: q })
        .expect(200);
    }
    await ctx.prisma.product.update({
      where: { id: scarce.id },
      data: { stock: 1 },
    });

    await ctx
      .http()
      .post('/orders')
      .set('Authorization', auth)
      .send({ shippingAddress: address })
      .expect(409);

    expect(await stockOf(plenty.id)).toBe(10);
    expect(await ctx.prisma.order.count()).toBe(0);
    expect(
      (await ctx.http().get('/cart').set('Authorization', auth)).body.items,
    ).toHaveLength(2);
  });

  it('lets a customer cancel before shipping, puts the stock back, and only once', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    const mug = await makeProduct(ctx.prisma, { stock: 5 });
    const { body: order } = await placeOrder(ctx, auth, [[mug, 2]]);

    await ctx
      .http()
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', auth)
      .expect(201);
    expect(await stockOf(mug.id)).toBe(5);

    await ctx
      .http()
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', auth)
      .expect(409);
    expect(await stockOf(mug.id)).toBe(5);
  });

  it('keeps each customer’s orders private', async () => {
    const owner = bearer(ctx.app, await makeUser(ctx.prisma));
    const stranger = bearer(ctx.app, await makeUser(ctx.prisma));
    const { body: order } = await placeOrder(ctx, owner, [
      [await makeProduct(ctx.prisma), 1],
    ]);

    await ctx
      .http()
      .get(`/orders/${order.id}`)
      .set('Authorization', stranger)
      .expect(404);
    await ctx
      .http()
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', stranger)
      .expect(404);
    expect(
      (await ctx.http().get('/orders').set('Authorization', stranger)).body.meta
        .total,
    ).toBe(0);
  });

  it('lets an admin move an order along, but not skip steps or cancel after shipping', async () => {
    const customer = bearer(ctx.app, await makeUser(ctx.prisma));
    const admin = bearer(ctx.app, await makeUser(ctx.prisma, Role.ADMIN));
    const { body: order } = await placeOrder(ctx, customer, [
      [await makeProduct(ctx.prisma), 1],
    ]);
    const move = (status: string) =>
      ctx
        .http()
        .patch(`/admin/orders/${order.id}/status`)
        .set('Authorization', admin)
        .send({ status });

    await move('SHIPPED').expect(409);
    await move('PAID').expect(200);
    await move('SHIPPED')
      .expect(200)
      .expect((r) => expect(r.body.shippedAt).not.toBeNull());
    await move('CANCELLED').expect(409);
    await ctx
      .http()
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', customer)
      .expect(409);
    await move('DELIVERED').expect(200);
  });

  it('releases the stock of orders not paid in time', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    const mug = await makeProduct(ctx.prisma, { stock: 3 });
    const { body: unpaid } = await placeOrder(ctx, auth, [[mug, 2]]);
    const { body: paid } = await placeOrder(ctx, auth, [[mug, 1]]);
    await ctx.prisma.order.update({
      where: { id: paid.id },
      data: { status: OrderStatus.PAID },
    });
    expect(await stockOf(mug.id)).toBe(0);

    const released = await ctx.app
      .get(OrdersService)
      .releaseExpired(new Date(Date.now() + 31 * 60_000));

    expect(released).toBe(1);
    expect(await stockOf(mug.id)).toBe(2);
    expect(
      await ctx.prisma.order.findUniqueOrThrow({ where: { id: unpaid.id } }),
    ).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'Payment not received in time',
    });
  });

  it('validates the shipping address', async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    await ctx
      .http()
      .put(`/cart/items/${(await makeProduct(ctx.prisma)).id}`)
      .set('Authorization', auth)
      .send({ quantity: 1 });

    const { body } = await ctx
      .http()
      .post('/orders')
      .set('Authorization', auth)
      .send({ shippingAddress: { ...address, country: 'England' } })
      .expect(400);
    expect(body.message.join(' ')).toMatch(/country/);
  });
});
