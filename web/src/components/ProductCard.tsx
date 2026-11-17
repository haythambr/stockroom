import clsx from 'clsx';
import { Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import { money, stockNote } from '../lib/format';
import { ProductArt } from './ProductArt';

interface Props {
  product: Product;
  inCart: number;
  onAdd: () => void;
  adding?: boolean;
}

export function ProductCard({ product, inCart, onAdd, adding }: Props) {
  const note = stockNote(product.stock);
  const full = inCart >= product.stock;

  return (
    <article className="group card flex flex-col overflow-hidden">
      <Link
        to={`/products/${product.slug}`}
        className="block"
        aria-label={product.name}
      >
        <ProductArt
          name={product.name}
          category={product.category.slug}
          className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-xs font-bold tracking-wide text-ink-3 uppercase">
          {product.category.name}
        </p>
        <h3 className="font-bold leading-snug">
          <Link to={`/products/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-lg font-extrabold tabular-nums">
              {money(product.priceCents)}
            </p>
            <p
              className={clsx(
                'text-xs font-bold',
                note.tone === 'out' && 'text-ink-3',
                note.tone === 'low' && 'text-ember-dark',
                note.tone === 'ok' && 'text-moss',
              )}
            >
              {note.text}
            </p>
          </div>
          <button
            className={clsx('btn-sm', inCart > 0 ? 'btn-ghost' : 'btn-primary')}
            onClick={onAdd}
            disabled={product.stock === 0 || full || adding}
            aria-label={`Add ${product.name} to cart`}
          >
            {inCart > 0 ? <Check size={16} /> : <Plus size={16} />}
            {product.stock === 0
              ? 'Sold out'
              : full
                ? 'All in cart'
                : inCart > 0
                  ? `${inCart} in cart`
                  : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
