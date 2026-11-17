import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { orderTotals } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** The cart with live prices and stock, so the customer sees problems before checkout. */
  async view(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
                priceCents: true,
                stock: true,
                isActive: true,
                category: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    const items = (cart?.items ?? []).map(({ product, quantity }) => ({
      product,
      quantity,
      lineTotalCents: product.priceCents * quantity,
      problem: !product.isActive
        ? 'No longer sold'
        : product.stock < quantity
          ? `Only ${product.stock} left`
          : null,
    }));

    return {
      items,
      ...orderTotals(
        items.map((i) => ({
          unitPriceCents: i.product.priceCents,
          quantity: i.quantity,
        })),
      ),
      canCheckout: items.length > 0 && items.every((i) => i.problem === null),
    };
  }

  /** Set how many of a product are in the cart (0 removes it). */
  async setQuantity(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        `Only ${product.stock} of ${product.name} in stock.`,
      );
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    if (quantity === 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity },
      });
    }

    return this.view(userId);
  }

  async clear(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });

    return this.view(userId);
  }
}
