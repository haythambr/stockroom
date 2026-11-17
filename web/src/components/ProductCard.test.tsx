import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../api/types';
import { ProductCard } from './ProductCard';

const product = (stock: number): Product => ({
  id: 'p1',
  sku: 'OFF-TRAY-05',
  name: 'Leather desk tray',
  slug: 'off-tray-05',
  description: 'Vegetable-tanned leather.',
  priceCents: 3200,
  stock,
  category: { id: 'c1', name: 'Home office', slug: 'home-office' },
});

const renderCard = (stock: number, inCart = 0, onAdd = vi.fn()) =>
  render(
    <MemoryRouter>
      <ProductCard product={product(stock)} inCart={inCart} onAdd={onAdd} />
    </MemoryRouter>,
  );

describe('ProductCard', () => {
  it('shows the price and adds to the cart', async () => {
    const onAdd = vi.fn();
    renderCard(10, 0, onAdd);

    expect(screen.getByText('$32.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add leather desk tray/i }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('warns when stock is low', () => {
    renderCard(1);
    expect(screen.getByText('Last one')).toBeInTheDocument();
  });

  it("can't add a sold-out product", () => {
    renderCard(0);
    expect(screen.getByRole('button', { name: /add leather desk tray/i })).toBeDisabled();
    expect(screen.getAllByText('Sold out')).not.toHaveLength(0);
  });

  it("can't add more than what's in stock", () => {
    renderCard(2, 2);
    const button = screen.getByRole('button', { name: /add leather desk tray/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('All in cart');
  });
});
