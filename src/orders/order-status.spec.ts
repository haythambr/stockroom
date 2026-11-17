import { OrderStatus } from '@prisma/client';
import { allowedFrom, canMove } from './order-status';

describe('order status flow', () => {
  it('follows pending → paid → shipped → delivered', () => {
    expect(canMove(OrderStatus.PENDING_PAYMENT, OrderStatus.PAID)).toBe(true);
    expect(canMove(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(true);
    expect(canMove(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
  });

  it('never skips a step or goes backwards', () => {
    expect(canMove(OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED)).toBe(
      false,
    );
    expect(canMove(OrderStatus.SHIPPED, OrderStatus.PAID)).toBe(false);
    expect(canMove(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toBe(false);
  });

  it('allows cancelling only before the parcel ships', () => {
    expect(allowedFrom(OrderStatus.CANCELLED).sort()).toEqual(
      [OrderStatus.PAID, OrderStatus.PENDING_PAYMENT].sort(),
    );
    expect(canMove(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(false);
    expect(canMove(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
  });
});
