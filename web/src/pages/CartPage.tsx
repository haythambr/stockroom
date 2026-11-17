import { ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart, useSetCartQuantity } from '../api/hooks';
import type { Cart } from '../api/types';
import { ProductArt } from '../components/ProductArt';
import { Alert, Empty, QuantityStepper, Spinner } from '../components/ui';
import { FREE_SHIPPING_FROM_CENTS, money } from '../lib/format';

export function OrderSummary({
  cart,
  children,
}: {
  cart: Pick<Cart, 'subtotalCents' | 'shippingCents' | 'totalCents'>;
  children?: React.ReactNode;
}) {
  const toFree = FREE_SHIPPING_FROM_CENTS - cart.subtotalCents;

  return (
    <aside className="card h-fit p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-2xl">Summary</h2>
      <dl className="mt-5 space-y-2 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-ink-2">Subtotal</dt>
          <dd className="font-bold tabular-nums">
            {money(cart.subtotalCents)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-2">Shipping</dt>
          <dd className="font-bold tabular-nums">
            {cart.shippingCents === 0 ? 'Free' : money(cart.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-lg">
          <dt className="font-bold">Total</dt>
          <dd className="font-extrabold tabular-nums">
            {money(cart.totalCents)}
          </dd>
        </div>
      </dl>
      {toFree > 0 && cart.subtotalCents > 0 && (
        <div className="mt-4">
          <p className="text-sm text-ink-2">
            Add <strong>{money(toFree)}</strong> more for free shipping.
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
            <div
              className="h-full rounded-full bg-ember"
              style={{
                width: `${Math.min(100, (cart.subtotalCents / FREE_SHIPPING_FROM_CENTS) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      {children && <div className="mt-6">{children}</div>}
    </aside>
  );
}

export function CartPage() {
  const { data: cart, isLoading, error } = useCart();
  const setQuantity = useSetCartQuantity();

  if (isLoading) return <Spinner />;
  if (error || !cart)
    return <Alert>{error?.message ?? 'Could not load your cart.'}</Alert>;

  if (cart.items.length === 0) {
    return (
      <Empty title="Your cart is empty">
        <Link to="/" className="btn-primary mt-4">
          Start shopping
        </Link>
      </Empty>
    );
  }

  return (
    <>
      <h1 className="mb-6 font-display text-4xl">Your cart</h1>
      {setQuantity.error && (
        <div className="mb-4">
          <Alert>{setQuantity.error.message}</Alert>
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="card divide-y divide-line">
          {cart.items.map((line) => (
            <li key={line.product.id} className="flex gap-4 p-4 sm:p-5">
              <Link to={`/products/${line.product.slug}`} className="shrink-0">
                <ProductArt
                  name={line.product.name}
                  category={line.product.category.slug}
                  className="size-20 rounded-xl sm:size-24"
                  iconSize={36}
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${line.product.slug}`}
                      className="font-bold hover:underline"
                    >
                      {line.product.name}
                    </Link>
                    <p className="text-sm text-ink-3">
                      {money(line.product.priceCents)} each
                    </p>
                  </div>
                  <p className="font-extrabold tabular-nums">
                    {money(line.lineTotalCents)}
                  </p>
                </div>
                {line.problem && (
                  <p className="text-sm font-bold text-rose">{line.problem}</p>
                )}
                <div className="flex items-center gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    max={Math.max(line.product.stock, line.quantity)}
                    disabled={setQuantity.isPending}
                    onChange={(quantity) =>
                      setQuantity.mutate({
                        productId: line.product.id,
                        quantity: Math.min(quantity, line.product.stock),
                      })
                    }
                  />
                  <button
                    className="inline-flex items-center gap-1 text-sm font-bold text-ink-3 hover:text-rose"
                    onClick={() =>
                      setQuantity.mutate({
                        productId: line.product.id,
                        quantity: 0,
                      })
                    }
                    disabled={setQuantity.isPending}
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <OrderSummary cart={cart}>
          {!cart.canCheckout && (
            <p className="mb-3 text-sm font-bold text-rose">
              Fix the items marked in red to check out.
            </p>
          )}
          <Link
            to="/checkout"
            className={`btn-ember w-full ${cart.canCheckout ? '' : 'pointer-events-none opacity-45'}`}
            aria-disabled={!cart.canCheckout}
          >
            Checkout <ArrowRight size={18} />
          </Link>
        </OrderSummary>
      </div>
    </>
  );
}
