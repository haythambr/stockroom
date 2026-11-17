/**
 * Pretends to be the payment provider: sends a signed "payment.succeeded" event for an order.
 *
 *   npm run webhook:pay -- <orderId>            pays the order's exact total
 *   npm run webhook:pay -- <orderId> 100        pays a different amount (shows amount_mismatch)
 *
 * Run it twice with the same EVENT_ID to see the duplicate being ignored.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { signPayload } from '../src/payments/signature';

async function main() {
  const [orderId, amountArg] = process.argv.slice(2);
  if (!orderId) {
    console.error('Usage: npm run webhook:pay -- <orderId> [amountCents]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { totalCents: true },
  });
  await prisma.$disconnect();

  const body = JSON.stringify({
    id: process.env.EVENT_ID ?? `evt_${randomBytes(8).toString('hex')}`,
    type: 'payment.succeeded',
    data: {
      orderId,
      amountCents: amountArg ? Number(amountArg) : (order?.totalCents ?? 0),
    },
  });

  const url = `http://localhost:${process.env.PORT ?? 3000}/payments/webhook`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stockroom-Signature': signPayload(
        body,
        process.env.PAYMENT_WEBHOOK_SECRET ?? '',
      ),
    },
    body,
  });

  console.log(
    `POST ${url}\n${body}\n→ ${response.status} ${await response.text()}`,
  );
}

void main();
