import { describe, expect, it } from 'vitest';
import { money, orderNumber, stockNote } from './format';

describe('money', () => {
  it('formats cents as dollars', () => {
    expect(money(3699)).toBe('$36.99');
    expect(money(11900)).toBe('$119.00');
  });
});

describe('orderNumber', () => {
  it('pads to five digits', () => {
    expect(orderNumber(19)).toBe('#00019');
  });
});

describe('stockNote', () => {
  it('tells shoppers how much is left', () => {
    expect(stockNote(0)).toEqual({ text: 'Sold out', tone: 'out' });
    expect(stockNote(1)).toEqual({ text: 'Last one', tone: 'low' });
    expect(stockNote(3)).toEqual({ text: 'Only 3 left', tone: 'low' });
    expect(stockNote(40)).toEqual({ text: 'In stock', tone: 'ok' });
  });
});
