import type { OrderStatus } from '../api/types';

export const FREE_SHIPPING_FROM_CENTS = 5000;

export function money(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function orderNumber(n: number): string {
  return `#${String(n).padStart(5, '0')}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** What the stock count means to a shopper. */
export function stockNote(stock: number): {
  text: string;
  tone: 'out' | 'low' | 'ok';
} {
  if (stock <= 0) return { text: 'Sold out', tone: 'out' };
  if (stock <= 3)
    return {
      text: stock === 1 ? 'Last one' : `Only ${stock} left`,
      tone: 'low',
    };
  return { text: 'In stock', tone: 'ok' };
}
