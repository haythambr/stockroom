import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockReason } from '@prisma/client';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

const ORDER_BY: Record<
  ProductQueryDto['sort'],
  Prisma.ProductOrderByWithRelationInput
> = {
  newest: { createdAt: 'desc' },
  price: { priceCents: 'asc' },
  '-price': { priceCents: 'desc' },
  name: { name: 'asc' },
};

const PUBLIC_FIELDS = {
  id: true,
  sku: true,
  name: true,
  slug: true,
  description: true,
  priceCents: true,
  stock: true,
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductQueryDto, includeInactive = false) {
    const where: Prisma.ProductWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.inStock ? { stock: { gt: 0 } } : {}),
      ...(query.minPriceCents !== undefined || query.maxPriceCents !== undefined
        ? { priceCents: { gte: query.minPriceCents, lte: query.maxPriceCents } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: {
          ...PUBLIC_FIELDS,
          ...(includeInactive ? { isActive: true } : {}),
        },
        orderBy: [ORDER_BY[query.sort], { id: 'asc' }],
        ...skipTake(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findPublic(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [
          { slug: idOrSlug },
          ...(isUuid(idOrSlug) ? [{ id: idOrSlug }] : []),
        ],
      },
      select: PUBLIC_FIELDS,
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: dto });

      if (dto.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            change: dto.stock,
            reason: StockReason.RESTOCK,
            note: 'Opening stock',
          },
        });
      }

      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const { stock, ...rest } = dto;

    if (stock !== undefined) {
      throw new ConflictException(
        'Change stock with POST /products/:id/stock so the change is logged.',
      );
    }

    return this.prisma.product.update({ where: { id }, data: rest });
  }

  /**
   * Add or remove stock. Removing can't take the count below zero: the check and the
   * change happen in one UPDATE, so it holds even while orders are being placed.
   */
  async adjustStock(id: string, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.product.updateMany({
        where: {
          id,
          ...(dto.change < 0 ? { stock: { gte: -dto.change } } : {}),
        },
        data: { stock: { increment: dto.change } },
      });

      if (changed.count === 0) {
        const product = await tx.product.findUnique({
          where: { id },
          select: { stock: true },
        });
        if (!product) {
          throw new NotFoundException('Product not found.');
        }
        throw new ConflictException(
          `Only ${product.stock} in stock, so ${-dto.change} can't be removed.`,
        );
      }

      await tx.stockMovement.create({
        data: {
          productId: id,
          change: dto.change,
          reason: dto.change > 0 ? StockReason.RESTOCK : StockReason.ADJUSTMENT,
          note: dto.note,
        },
      });

      return tx.product.findUniqueOrThrow({
        where: { id },
        select: { id: true, sku: true, name: true, stock: true },
      });
    });
  }

  movements(id: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
