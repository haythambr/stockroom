import { OrderStatus } from '@prisma/client';

/**
 * Where an order may go next. Payment comes from the payment webhook (or an admin, for bank
 * transfers); shipping and delivery come from an admin; cancelling is allowed until it ships.
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export function canMove(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

/** Statuses an order must be in to move to `to`: the inverse of NEXT_STATUSES. */
export function allowedFrom(to: OrderStatus): OrderStatus[] {
  return (Object.keys(NEXT_STATUSES) as OrderStatus[]).filter((from) =>
    canMove(from, to),
  );
}

/** The timestamp column stamped when an order reaches each status. */
export const STATUS_TIMESTAMP: Partial<
  Record<OrderStatus, 'paidAt' | 'shippedAt' | 'deliveredAt' | 'cancelledAt'>
> = {
  PAID: 'paidAt',
  SHIPPED: 'shippedAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};
