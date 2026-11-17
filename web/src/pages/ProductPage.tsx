import clsx from 'clsx';
import { ArrowLeft, Check, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useProduct } from '../api/hooks';
import { ProductArt } from '../components/ProductArt';
import { Alert, Empty, QuantityStepper, Spinner } from '../components/ui';
import { FREE_SHIPPING_FROM_CENTS, money, stockNote } from '../lib/format';
import { useAddToCart } from '../lib/useAddToCart';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading, error } = useProduct(slug);
  const cart = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <Spinner />;
  if (error instanceof ApiError && error.status === 404)
    return (
      <Empty title="Product not found">
        <Link to="/" className="font-bold underline">
          Back to the shop
        </Link>
      </Empty>
    );
  if (error || !product)
    return <Alert>{error?.message ?? 'Something went wrong.'}</Alert>;

  const note = stockNote(product.stock);
  const already = cart.inCart(product.id);
  const canAdd = product.stock - already;
  const justAdded = cart.lastAdded === product.id;

  return (
    <>
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={16} /> All products
      </Link>
      <div className="grid gap-10 md:grid-cols-2">
        <ProductArt
          name={product.name}
          category={product.category.slug}
          className="aspect-square rounded-3xl"
          iconSize={150}
        />

        <div className="flex flex-col">
          <Link
            to={`/?category=${product.category.slug}`}
            className="eyebrow hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 text-3xl font-extrabold tabular-nums">
            {money(product.priceCents)}
          </p>
          <p
            className={clsx(
              'mt-1 font-bold',
              note.tone === 'out' && 'text-ink-3',
              note.tone === 'low' && 'text-ember-dark',
              note.tone === 'ok' && 'text-moss',
            )}
          >
            {note.text}
            {note.tone === 'ok' && ` · ${product.stock} available`}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-2">
            {product.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {canAdd > 0 && (
              <QuantityStepper
                value={Math.min(quantity, canAdd)}
                max={canAdd}
                onChange={setQuantity}
              />
            )}
            <button
              className="btn-ember btn min-h-12 px-7 text-base"
              disabled={canAdd <= 0 || cart.pending}
              onClick={() => cart.add(product, Math.min(quantity, canAdd))}
            >
              {justAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
              {product.stock === 0
                ? 'Sold out'
                : canAdd <= 0
                  ? 'All of them are in your cart'
                  : justAdded
                    ? 'Added'
                    : 'Add to cart'}
            </button>
            {already > 0 && (
              <Link to="/cart" className="font-bold underline">
                {already} in your cart
              </Link>
            )}
          </div>
          {cart.error && (
            <div className="mt-4">
              <Alert>{cart.error.message}</Alert>
            </div>
          )}

          <p className="mt-auto flex items-center gap-2 pt-10 text-sm text-ink-3">
            <Truck size={16} /> Free shipping on orders from{' '}
            {money(FREE_SHIPPING_FROM_CENTS)}. SKU {product.sku}
          </p>
        </div>
      </div>
    </>
  );
}
