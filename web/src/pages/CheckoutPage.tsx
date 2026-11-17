import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useCart, useCheckout } from '../api/hooks';
import type { Address } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Alert, Spinner } from '../components/ui';
import { money } from '../lib/format';
import { OrderSummary } from './CartPage';

const COUNTRIES = [
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['IE', 'Ireland'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['NL', 'Netherlands'],
  ['AE', 'United Arab Emirates'],
  ['JO', 'Jordan'],
] as const;

export function CheckoutPage() {
  const { user } = useAuth();
  const { data: cart, isLoading } = useCart();
  const checkout = useCheckout();
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address>({
    fullName: user?.name ?? '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'GB',
  });

  if (isLoading) return <Spinner />;
  if (!cart || (cart.items.length === 0 && !checkout.isPending))
    return <Navigate to="/cart" replace />;

  const field = (key: keyof Address) => ({
    value: address[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((a) => ({ ...a, [key]: e.target.value })),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    checkout.mutate(
      { ...address, line2: address.line2 || undefined },
      {
        onSuccess: (order) =>
          navigate(`/orders/${order.id}`, { state: { placed: true } }),
      },
    );
  };

  // A 409 means something sold out between the cart and now; the API says what's left.
  const soldOut =
    checkout.error instanceof ApiError && checkout.error.status === 409;

  return (
    <>
      <h1 className="mb-6 font-display text-4xl">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          id="checkout"
          onSubmit={submit}
          className="card space-y-5 p-6"
          noValidate
        >
          <h2 className="font-display text-2xl">Shipping address</h2>
          {checkout.error && (
            <Alert>
              {soldOut ? (
                <>
                  {checkout.error.message} Someone bought it while you were
                  checking out.{' '}
                  <Link to="/cart" className="underline">
                    Review your cart
                  </Link>
                </>
              ) : (
                checkout.error.message
              )}
            </Alert>
          )}
          <div>
            <label className="label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="input"
              autoComplete="name"
              required
              {...field('fullName')}
            />
          </div>
          <div>
            <label className="label" htmlFor="line1">
              Address
            </label>
            <input
              id="line1"
              className="input"
              autoComplete="address-line1"
              placeholder="Street and number"
              required
              {...field('line1')}
            />
            <input
              className="input mt-2"
              autoComplete="address-line2"
              placeholder="Flat, floor (optional)"
              aria-label="Address line 2"
              {...field('line2')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                className="input"
                autoComplete="address-level2"
                required
                {...field('city')}
              />
            </div>
            <div>
              <label className="label" htmlFor="postalCode">
                Postcode
              </label>
              <input
                id="postalCode"
                className="input"
                autoComplete="postal-code"
                required
                {...field('postalCode')}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="country">
              Country
            </label>
            <select
              id="country"
              className="input"
              autoComplete="country"
              {...field('country')}
            >
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <Lock size={14} /> Your items are held for 30 minutes while you pay.
          </p>
        </form>

        <OrderSummary cart={cart}>
          <ul className="mb-5 space-y-1.5 text-sm">
            {cart.items.map((i) => (
              <li key={i.product.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {i.quantity} × {i.product.name}
                </span>
                <span className="font-semibold tabular-nums">
                  {money(i.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="submit"
            form="checkout"
            className="btn-ember w-full"
            disabled={checkout.isPending || !cart.canCheckout}
          >
            {checkout.isPending
              ? 'Placing order…'
              : `Place order · ${money(cart.totalCents)}`}
          </button>
        </OrderSummary>
      </div>
    </>
  );
}
