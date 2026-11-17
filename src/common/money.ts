/** Shipping is free from this order subtotal upward. */
export const FREE_SHIPPING_FROM_CENTS = 5000;
export const SHIPPING_CENTS = 499;

export function orderTotals(
  lines: { unitPriceCents: number; quantity: number }[],
): {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
} {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_FROM_CENTS
      ? 0
      : SHIPPING_CENTS;

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
