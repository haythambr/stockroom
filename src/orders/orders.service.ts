import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, StockReason } from '@prisma/client';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { orderTotals } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, OrderQueryDto } from './dto/order.dto';
import { allowedFrom, STATUS_TIMESTAMP } from './order-status';

type Tx = Prisma.TransactionClient;

const ORDER_INCLUDE = {
  items: { orderBy: { productName: 'asc' } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Turn the cart into an order and take the stock, all in one transaction.
   *
   * Each product's stock goes down with a conditional UPDATE (`... WHERE stock >= quantity`).
   * PostgreSQL locks the row while it does that, so when two customers buy the last unit at the
   * same moment, the second UPDATE sees stock 0, changes nothing, and that checkout is refused
   * with 409 instead of overselling. Nothing else in the order is saved when that happens.
   */
  async checkout(userId: string, dto: CheckoutDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: { include: { product: true }, orderBy: { productId: 'asc' } },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty.');
      }

      // Same order every time (by product id), so two checkouts can't deadlock each other.
      for (const { product, quantity } of cart.items) {
        const taken = await tx.product.updateMany({
          where: { id: product.id, isActive: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });

        if (taken.count === 0) {
          const now = await tx.product.findUnique({
            where: { id: product.id },
            select: { stock: true, isActive: true },
          });
          throw new ConflictException({
            message:
              now?.isActive === false
                ? `${product.name} is no longer sold.`
                : `Only ${now?.stock ?? 0} of ${product.name} left.`,
            productId: product.id,
            available: now?.isActive === false ? 0 : (now?.stock ?? 0),
          });
        }
      }

      const lines = cart.items.map(({ product, quantity }) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPriceCents: product.priceCents,
        quantity,
        lineTotalCents: product.priceCents * quantity,
      }));

      const order = await tx.order.create({
        data: {
          userId,
          ...orderTotals(lines),
          shippingAddress: { ...dto.shippingAddress },
          expiresAt: new Date(
            Date.now() +
              this.config.get<number>('ORDER_PAYMENT_MINUTES', 30) * 60_000,
          ),
          items: { create: lines },
        },
        include: ORDER_INCLUDE,
      });

      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          productId: l.productId,
          change: -l.quantity,
          reason: StockReason.ORDER,
          orderId: order.id,
        })),
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  async list(query: OrderQueryDto, userId?: string) {
    const where: Prisma.OrderWhereInput = {
      ...(userId ? { userId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          ...(userId
            ? {}
            : { user: { select: { id: true, name: true, email: true } } }),
        },
        orderBy: { createdAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async find(id: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: {
        ...ORDER_INCLUDE,
        ...(userId
          ? {}
          : {
              user: { select: { id: true, name: true, email: true } },
              paymentEvents: true,
            }),
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  /**
   * Move an order to a new status. The status check and the change are a single UPDATE
   * (`WHERE status IN (...)`), so two requests can't, for example, both cancel the same order
   * and put its stock back twice. Cancelling returns the stock.
   */
  async moveTo(
    id: string,
    to: OrderStatus,
    opts: { userId?: string; reason?: string; tx?: Tx } = {},
  ) {
    const run = async (tx: Tx) => {
      const timestamp = STATUS_TIMESTAMP[to];
      const moved = await tx.order.updateMany({
        where: {
          id,
          status: { in: allowedFrom(to) },
          ...(opts.userId ? { userId: opts.userId } : {}),
        },
        data: {
          status: to,
          ...(timestamp ? { [timestamp]: new Date() } : {}),
          ...(to === OrderStatus.CANCELLED
            ? { cancelReason: opts.reason ?? 'Cancelled' }
            : {}),
        },
      });

      if (moved.count === 0) {
        const order = await tx.order.findFirst({
          where: { id, ...(opts.userId ? { userId: opts.userId } : {}) },
          select: { status: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found.');
        }
        throw new ConflictException(
          `A ${label(order.status)} order can't be marked ${label(to)}.`,
        );
      }

      if (to === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.stockMovement.createMany({
          data: items.map((i) => ({
            productId: i.productId,
            change: i.quantity,
            reason: StockReason.CANCEL,
            orderId: id,
            note: opts.reason,
          })),
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: ORDER_INCLUDE,
      });
    };

    return opts.tx ? run(opts.tx) : this.prisma.$transaction(run);
  }

  /**
   * Orders not paid in time give their stock back, so an abandoned checkout doesn't hold the
   * last units forever. Runs every minute (see OrdersScheduler).
   */
  async releaseExpired(now = new Date()): Promise<number> {
    const expired = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING_PAYMENT, expiresAt: { lt: now } },
      select: { id: true },
    });

    let released = 0;
    for (const { id } of expired) {
      try {
        await this.moveTo(id, OrderStatus.CANCELLED, {
          reason: 'Payment not received in time',
        });
        released++;
      } catch (error) {
        // Paid in the meantime: nothing to release.
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }
    }

    if (released) {
      this.logger.log(
        `Released stock from ${released} unpaid ${released === 1 ? 'order' : 'orders'}.`,
      );
    }

    return released;
  }
}

function label(status: OrderStatus): string {
  return status.toLowerCase().replace('_', ' ');
}
