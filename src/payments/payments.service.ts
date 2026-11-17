import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifySignature } from './signature';

interface PaymentEventBody {
  id?: unknown;
  type?: unknown;
  data?: { orderId?: unknown; amountCents?: unknown };
}

export type WebhookOutcome =
  | 'marked_paid'
  | 'duplicate'
  | 'already_paid'
  | 'unknown_order'
  | 'amount_mismatch'
  | 'order_cancelled_refund_needed'
  | 'payment_failed'
  | 'ignored';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Handle a payment provider webhook. The event id is saved in the same transaction as its
   * effect, so a provider retrying the same event (which they all do) changes nothing the second time.
   */
  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ received: true; outcome: WebhookOutcome }> {
    const check = verifySignature(
      rawBody,
      signature,
      this.config.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET'),
    );
    if (!check.ok) {
      throw new BadRequestException(check.reason);
    }

    const event = this.parse(rawBody);

    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        const order = event.orderId
          ? await tx.order.findUnique({ where: { id: event.orderId } })
          : null;
        const outcome = this.decide(event, order);

        await tx.paymentEvent.create({
          data: {
            id: event.id,
            type: event.type,
            orderId: order?.id ?? null,
            amountCents: event.amountCents,
            outcome,
          },
        });

        if (outcome === 'marked_paid') {
          await this.orders.moveTo(order!.id, OrderStatus.PAID, { tx });
        }

        return outcome;
      });

      if (
        outcome === 'order_cancelled_refund_needed' ||
        outcome === 'amount_mismatch'
      ) {
        this.logger.warn(
          `Payment event ${event.id}: ${outcome} (order ${event.orderId}). Needs a person to look at it.`,
        );
      }

      return { received: true, outcome };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true, outcome: 'duplicate' };
      }
      throw error;
    }
  }

  private decide(
    event: { type: string; amountCents: number | null },
    order: { status: OrderStatus; totalCents: number } | null,
  ): WebhookOutcome {
    if (event.type === 'payment.failed') {
      return 'payment_failed';
    }
    if (event.type !== 'payment.succeeded') {
      return 'ignored';
    }
    if (!order) {
      return 'unknown_order';
    }
    if (event.amountCents !== order.totalCents) {
      return 'amount_mismatch';
    }
    if (order.status === OrderStatus.CANCELLED) {
      // Money arrived after the order expired or was cancelled: someone must refund it.
      return 'order_cancelled_refund_needed';
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return 'already_paid';
    }

    return 'marked_paid';
  }

  private parse(rawBody: string): {
    id: string;
    type: string;
    orderId: string | null;
    amountCents: number | null;
  } {
    let body: PaymentEventBody;
    try {
      body = JSON.parse(rawBody) as PaymentEventBody;
    } catch {
      throw new BadRequestException('Body is not valid JSON.');
    }

    if (typeof body.id !== 'string' || typeof body.type !== 'string') {
      throw new BadRequestException('Event needs a string "id" and "type".');
    }

    const orderId =
      typeof body.data?.orderId === 'string' &&
      /^[0-9a-f-]{36}$/i.test(body.data.orderId)
        ? body.data.orderId
        : null;
    const amountCents = Number.isInteger(body.data?.amountCents)
      ? (body.data!.amountCents as number)
      : null;

    return { id: body.id, type: body.type, orderId, amountCents };
  }
}
