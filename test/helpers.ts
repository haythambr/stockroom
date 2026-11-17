import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Product, Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp, setupSwagger } from '../src/setup';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

/** The real app (same pipes, guards and filters as production) on the test database. */
export async function createApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app);
  setupSwagger(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE payment_events, stock_movements, order_items, orders, cart_items, carts, refresh_tokens, products, categories, users RESTART IDENTITY CASCADE',
  );
}

export async function makeUser(
  prisma: PrismaService,
  role: Role = Role.CUSTOMER,
  password = 'password123',
): Promise<User> {
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${randomUUID().slice(0, 8)}@example.com`,
      name: 'Test User',
      role,
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
}

/** An access token without going through /auth/login, for tests that aren't about signing in. */
export function bearer(app: INestApplication, user: User): string {
  const token = app
    .get(JwtService)
    .sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: 900 },
    );

  return `Bearer ${token}`;
}

let skuCounter = 0;

export async function makeProduct(
  prisma: PrismaService,
  data: Partial<
    Pick<Product, 'name' | 'priceCents' | 'stock' | 'isActive' | 'description'>
  > & { category?: string } = {},
): Promise<Product> {
  const slug = data.category ?? 'general';
  const category = await prisma.category.upsert({
    where: { slug },
    create: { slug, name: slug },
    update: {},
  });
  const n = ++skuCounter;

  return prisma.product.create({
    data: {
      sku: `TEST-${n}`,
      slug: `test-product-${n}`,
      name: data.name ?? `Test product ${n}`,
      description: data.description ?? 'A product for tests.',
      priceCents: data.priceCents ?? 1000,
      stock: data.stock ?? 10,
      isActive: data.isActive ?? true,
      categoryId: category.id,
    },
  });
}

export const address = {
  fullName: 'Sam Carter',
  line1: '221B Baker Street',
  city: 'London',
  postalCode: 'NW1 6XE',
  country: 'GB',
};

/** Put products in a user's cart and check out. Returns the HTTP response. */
export async function placeOrder(
  ctx: TestContext,
  auth: string,
  lines: [Product, number][],
) {
  for (const [product, quantity] of lines) {
    await ctx
      .http()
      .put(`/cart/items/${product.id}`)
      .set('Authorization', auth)
      .send({ quantity })
      .expect(200);
  }

  return ctx
    .http()
    .post('/orders')
    .set('Authorization', auth)
    .send({ shippingAddress: address });
}
