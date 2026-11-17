/**
 * Demo data: an admin, a customer, five categories and 24 products, plus a few orders in
 * different states so every admin endpoint has something to show.
 * Run with `npx prisma db seed` (also runs after `prisma migrate reset`).
 */
import { OrderStatus, PrismaClient, Role, StockReason } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const catalog: Record<
  string,
  {
    name: string;
    products: [
      sku: string,
      name: string,
      priceCents: number,
      stock: number,
      description: string,
    ][];
  }
> = {
  kitchen: {
    name: 'Kitchen',
    products: [
      [
        'KIT-MUG-01',
        'Stoneware mug',
        1800,
        40,
        'Hand-glazed stoneware, 350 ml. Dishwasher safe.',
      ],
      [
        'KIT-POUR-02',
        'Pour-over coffee set',
        4200,
        12,
        'Ceramic dripper, glass server and 40 paper filters.',
      ],
      [
        'KIT-BOARD-03',
        'Oak chopping board',
        3500,
        18,
        'End-grain oak, 40 × 28 cm, finished with food-safe oil.',
      ],
      [
        'KIT-KNIFE-04',
        'Chef’s knife, 20 cm',
        6900,
        7,
        'Japanese steel, full tang, comes razor sharp.',
      ],
      [
        'KIT-JAR-05',
        'Glass storage jars (set of 3)',
        2400,
        25,
        'Airtight bamboo lids. 0.5, 1 and 1.5 litres.',
      ],
    ],
  },
  'home-office': {
    name: 'Home office',
    products: [
      [
        'OFF-LAMP-01',
        'Brass desk lamp',
        8900,
        9,
        'Adjustable arm, warm LED, USB-C charging port in the base.',
      ],
      [
        'OFF-NOTE-02',
        'Linen notebook, A5',
        1400,
        60,
        '192 dotted pages, lay-flat binding.',
      ],
      [
        'OFF-STAND-03',
        'Walnut laptop stand',
        5400,
        15,
        'Raises the screen 12 cm. Fits 13–16 inch laptops.',
      ],
      [
        'OFF-PEN-04',
        'Refillable gel pen',
        900,
        80,
        'Aluminium body, 0.5 mm black ink.',
      ],
      [
        'OFF-TRAY-05',
        'Leather desk tray',
        3200,
        1,
        'Vegetable-tanned leather. The last one in this colour.',
      ],
    ],
  },
  outdoors: {
    name: 'Outdoors',
    products: [
      [
        'OUT-BOTTLE-01',
        'Insulated bottle, 750 ml',
        2900,
        35,
        'Keeps drinks cold for 24 hours and hot for 12.',
      ],
      [
        'OUT-BLANKET-02',
        'Waterproof picnic blanket',
        4500,
        10,
        '200 × 150 cm, folds into its own strap.',
      ],
      [
        'OUT-LANTERN-03',
        'Rechargeable lantern',
        3900,
        0,
        '40 hours of light on low. Back in stock soon.',
      ],
      [
        'OUT-KNIFE-04',
        'Folding pocket knife',
        3300,
        14,
        'Stainless blade with a locking liner.',
      ],
      [
        'OUT-SEAT-05',
        'Packable camp stool',
        2700,
        20,
        'Holds 120 kg and weighs 700 g.',
      ],
    ],
  },
  wellbeing: {
    name: 'Wellbeing',
    products: [
      [
        'WEL-MAT-01',
        'Cork yoga mat',
        6200,
        11,
        'Natural cork top with a rubber base. 4 mm.',
      ],
      [
        'WEL-CANDLE-02',
        'Cedar & sage candle',
        2200,
        30,
        '45-hour soy wax candle in a reusable tin.',
      ],
      [
        'WEL-TEA-03',
        'Loose-leaf tea sampler',
        1900,
        45,
        'Six herbal blends, 25 g each.',
      ],
      [
        'WEL-ROLLER-04',
        'Massage roller',
        2500,
        16,
        'Textured foam roller for back and legs.',
      ],
    ],
  },
  bags: {
    name: 'Bags',
    products: [
      [
        'BAG-TOTE-01',
        'Canvas tote',
        2000,
        50,
        'Heavy cotton canvas with an inside pocket.',
      ],
      [
        'BAG-BACK-02',
        'Roll-top backpack, 22 l',
        9800,
        8,
        'Waterproof, with a padded laptop sleeve.',
      ],
      [
        'BAG-POUCH-03',
        'Zip pouch',
        1600,
        34,
        'Recycled nylon, for cables and chargers.',
      ],
      [
        'BAG-DUFF-04',
        'Weekend duffel',
        11900,
        5,
        'Waxed canvas and leather handles. Fits cabin size limits.',
      ],
      [
        'BAG-SLING-05',
        'Everyday sling bag',
        4800,
        2,
        'Crossbody bag with a hidden back pocket.',
      ],
    ],
  },
};

async function main() {
  // Start from empty tables, with order numbers starting again at 1.
  await prisma.$executeRawUnsafe(
    'TRUNCATE payment_events, stock_movements, order_items, orders, cart_items, carts, refresh_tokens, products, categories, users RESTART IDENTITY CASCADE',
  );

  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@stockroom.test',
      name: 'Avery Admin',
      role: Role.ADMIN,
      passwordHash,
    },
  });
  const customer = await prisma.user.create({
    data: {
      email: 'customer@stockroom.test',
      name: 'Sam Carter',
      role: Role.CUSTOMER,
      passwordHash,
    },
  });
  const other = await prisma.user.create({
    data: {
      email: 'jordan@example.com',
      name: 'Jordan Lee',
      role: Role.CUSTOMER,
      passwordHash,
    },
  });

  const bySku = new Map<
    string,
    { id: string; name: string; sku: string; priceCents: number }
  >();
  for (const [slug, { name, products }] of Object.entries(catalog)) {
    const category = await prisma.category.create({ data: { slug, name } });

    for (const [sku, productName, priceCents, stock, description] of products) {
      const product = await prisma.product.create({
        data: {
          sku,
          name: productName,
          slug: sku.toLowerCase(),
          description,
          priceCents,
          stock,
          categoryId: category.id,
        },
      });
      if (stock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            change: stock,
            reason: StockReason.RESTOCK,
            note: 'Opening stock',
          },
        });
      }
      bySku.set(sku, product);
    }
  }

  const address = {
    fullName: 'Sam Carter',
    line1: '221B Baker Street',
    city: 'London',
    postalCode: 'NW1 6XE',
    country: 'GB',
  };
  const day = 24 * 60 * 60 * 1000;
  const orders: {
    user: string;
    status: OrderStatus;
    daysAgo: number;
    lines: [string, number][];
  }[] = [
    {
      user: customer.id,
      status: OrderStatus.DELIVERED,
      daysAgo: 12,
      lines: [
        ['KIT-MUG-01', 2],
        ['WEL-TEA-03', 1],
      ],
    },
    {
      user: customer.id,
      status: OrderStatus.SHIPPED,
      daysAgo: 3,
      lines: [['OFF-LAMP-01', 1]],
    },
    {
      user: other.id,
      status: OrderStatus.PAID,
      daysAgo: 1,
      lines: [
        ['BAG-BACK-02', 1],
        ['BAG-POUCH-03', 2],
      ],
    },
    {
      user: other.id,
      status: OrderStatus.CANCELLED,
      daysAgo: 5,
      lines: [['OUT-BLANKET-02', 1]],
    },
  ];

  for (const o of orders) {
    const lines = o.lines.map(([sku, quantity]) => {
      const p = bySku.get(sku)!;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unitPriceCents: p.priceCents,
        quantity,
        lineTotalCents: p.priceCents * quantity,
      };
    });
    const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
    const shippingCents = subtotalCents >= 5000 ? 0 : 499;
    const createdAt = new Date(Date.now() - o.daysAgo * day);

    await prisma.order.create({
      data: {
        userId: o.user,
        status: o.status,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
        shippingAddress: address,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 30 * 60_000),
        paidAt:
          o.status === OrderStatus.CANCELLED
            ? null
            : new Date(createdAt.getTime() + 5 * 60_000),
        shippedAt: [OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(
          o.status as never,
        )
          ? new Date(createdAt.getTime() + day)
          : null,
        deliveredAt:
          o.status === OrderStatus.DELIVERED
            ? new Date(createdAt.getTime() + 3 * day)
            : null,
        cancelledAt:
          o.status === OrderStatus.CANCELLED
            ? new Date(createdAt.getTime() + 31 * 60_000)
            : null,
        cancelReason:
          o.status === OrderStatus.CANCELLED
            ? 'Payment not received in time'
            : null,
        items: { create: lines },
      },
    });
  }

  console.log(
    `Seeded ${bySku.size} products, 3 users and ${orders.length} orders.`,
  );
  console.log(
    'Sign in as admin@stockroom.test or customer@stockroom.test, password "password123".',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
