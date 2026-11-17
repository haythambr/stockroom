import { OrderStatus } from '@prisma/client';
import { signPayload } from '../src/payments/signature';
import {
  bearer,
  createApp,
  makeProduct,
  makeUser,
  placeOrder,
  resetDb,
  TestContext,
} from './helpers';

describe('Payment webhook (e2e)', () => {
  let ctx: TestContext;
  const secret = () => process.env.PAYMENT_WEBHOOK_SECRET!;

  beforeAll(async () => {
    ctx = await createApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.app.close());

  const send = (event: object, signature?: string) => {
    const body = JSON.stringify(event);
    return ctx
      .http()
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('Stockroom-Signature', signature ?? signPayload(body, secret()))
      .send(body);
  };

  const newOrder = async () => {
    const auth = bearer(ctx.app, await makeUser(ctx.prisma));
    return (
      await placeOrder(ctx, auth, [
        [await makeProduct(ctx.prisma, { priceCents: 2500 }), 1],
      ])
    ).body as { id: string; totalCents: number };
  };

  const paid = (order: { id: string; totalCents: number }, id = 'evt_1') => ({
    id,
    type: 'payment.succeeded',
    data: { orderId: order.id, amountCents: order.totalCents },
  });

  it('marks the order paid', async () => {
    const order = await newOrder();

    await send(paid(order))
      .expect(200)
      .expect((r) =>
        expect(r.body).toEqual({ received: true, outcome: 'marked_paid' }),
      );

    expect(
      await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'PAID', paidAt: expect.any(Date) });
  });

  it('applies a retried event only once', async () => {
    const order = await newOrder();

    await send(paid(order)).expect(200);
    await send(paid(order))
      .expect(200)
      .expect((r) => expect(r.body.outcome).toBe('duplicate'));

    expect(await ctx.prisma.paymentEvent.count()).toBe(1);
  });

  it('rejects events without a valid signature', async () => {
    const order = await newOrder();
    const body = JSON.stringify(paid(order));

    await send(paid(order), signPayload(body, 'not-the-secret')).expect(400);
    await send(
      paid(order),
      signPayload(body, secret(), Math.floor(Date.now() / 1000) - 3600),
    ).expect(400);
    await ctx
      .http()
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(400);

    expect(
      (await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('does not mark an order paid when the amount is wrong', async () => {
    const order = await newOrder();

    await send({ ...paid(order), data: { orderId: order.id, amountCents: 1 } })
      .expect(200)
      .expect((r) => expect(r.body.outcome).toBe('amount_mismatch'));

    expect(
      (await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('flags money that arrives after the order expired, for a refund', async () => {
    const order = await newOrder();
    await ctx.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    });

    await send(paid(order))
      .expect(200)
      .expect((r) =>
        expect(r.body.outcome).toBe('order_cancelled_refund_needed'),
      );
    expect(
      (await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe(OrderStatus.CANCELLED);
  });

  it('records unknown orders and other event types without failing', async () => {
    await send({
      id: 'evt_x',
      type: 'payment.succeeded',
      data: {
        orderId: '00000000-0000-4000-8000-000000000000',
        amountCents: 100,
      },
    })
      .expect(200)
      .expect((r) => expect(r.body.outcome).toBe('unknown_order'));
    await send({ id: 'evt_y', type: 'customer.updated' })
      .expect(200)
      .expect((r) => expect(r.body.outcome).toBe('ignored'));
  });
});

describe('Health and docs (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createApp();
  });
  afterAll(() => ctx.app.close());

  it('reports the database as up', async () => {
    await ctx
      .http()
      .get('/health')
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({ status: 'ok', database: 'up' }),
      );
  });

  it('serves the OpenAPI document', async () => {
    const { body } = await ctx.http().get('/docs-json').expect(200);

    expect(body.info.title).toBe('Stockroom API');
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/products',
        '/orders',
        '/payments/webhook',
      ]),
    );
  });
});
