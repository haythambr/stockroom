import { formatCents, orderTotals } from './money';

describe('orderTotals', () => {
  it('adds shipping below the free-shipping threshold', () => {
    expect(orderTotals([{ unitPriceCents: 1800, quantity: 2 }])).toEqual({
      subtotalCents: 3600,
      shippingCents: 499,
      totalCents: 4099,
    });
  });

  it('ships free from $50', () => {
    expect(orderTotals([{ unitPriceCents: 2500, quantity: 2 }])).toEqual({
      subtotalCents: 5000,
      shippingCents: 0,
      totalCents: 5000,
    });
  });

  it('works in whole cents, so totals never drift', () => {
    const lines = Array.from({ length: 10 }, () => ({
      unitPriceCents: 10,
      quantity: 3,
    }));
    expect(orderTotals(lines).subtotalCents).toBe(300);
  });

  it('charges nothing for an empty cart', () => {
    expect(orderTotals([])).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
  });
});

describe('formatCents', () => {
  it('formats dollars', () => {
    expect(formatCents(4099)).toBe('$40.99');
  });
});
