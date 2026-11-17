import clsx from 'clsx';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCategories, useProducts, type ProductFilters } from '../api/hooks';
import { ProductArt } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { Alert, Empty, Pagination, Spinner } from '../components/ui';
import { FREE_SHIPPING_FROM_CENTS, money } from '../lib/format';
import { useAddToCart } from '../lib/useAddToCart';

const SORTS: { value: NonNullable<ProductFilters['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price', label: 'Price: low to high' },
  { value: '-price', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
];

const HERO_TILES: [string, string][] = [
  ['Stoneware mug', 'kitchen'],
  ['Brass desk lamp', 'home-office'],
  ['Roll-top backpack', 'bags'],
  ['Cedar & sage candle', 'wellbeing'],
];

const PRICE_RANGES = [
  { label: 'Any price', min: undefined, max: undefined },
  { label: 'Under $20', min: undefined, max: 1999 },
  { label: '$20 – $50', min: 2000, max: 5000 },
  { label: 'Over $50', min: 5001, max: undefined },
];

/** Filters live in the URL, so a filtered view can be shared or bookmarked. */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const num = (key: string) =>
    params.get(key) ? Number(params.get(key)) : undefined;

  const filters: ProductFilters = {
    search: params.get('search') ?? undefined,
    category: params.get('category') ?? undefined,
    minPriceCents: num('min'),
    maxPriceCents: num('max'),
    inStock: params.get('inStock') === 'true' || undefined,
    sort: (params.get('sort') as ProductFilters['sort']) ?? 'newest',
    page: num('page') ?? 1,
    limit: 12,
  };

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return { filters, update };
}

export function ShopPage() {
  const { filters, update } = useFilters();
  const { data, isLoading, isFetching, error } = useProducts(filters);
  const { data: categories } = useCategories();
  const cart = useAddToCart();
  const [showFilters, setShowFilters] = useState(false);

  const priceIndex = PRICE_RANGES.findIndex(
    (r) => r.min === filters.minPriceCents && r.max === filters.maxPriceCents,
  );
  const activeCategory = categories?.find((c) => c.slug === filters.category);
  const hasFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.minPriceCents ||
    filters.maxPriceCents ||
    filters.inStock,
  );

  return (
    <>
      {!hasFilters && filters.page === 1 && (
        <section className="mb-10 grid items-center gap-8 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-paper sm:px-10 sm:py-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="eyebrow">New in this week</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] sm:text-6xl">
              Everyday things, <em className="text-ember">made well</em>.
            </h1>
            <p className="mt-4 max-w-xl text-paper/75">
              Kitchen, desk, outdoors and the bags to carry it all. Free
              shipping from {money(FREE_SHIPPING_FROM_CENTS)}, and the stock
              count you see is the real one.
            </p>
          </div>
          <div className="hidden grid-cols-2 gap-3 lg:grid" aria-hidden="true">
            {HERO_TILES.map(([name, category], i) => (
              <ProductArt
                key={name}
                name={name}
                category={category}
                iconSize={54}
                className={clsx(
                  'aspect-square rounded-2xl',
                  i % 2 ? 'translate-y-6' : '-translate-y-2',
                )}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">
            {filters.search
              ? `“${filters.search}”`
              : (activeCategory?.name ?? 'All products')}
          </h2>
          <p className="text-sm text-ink-3">
            {data
              ? `${data.meta.total} ${data.meta.total === 1 ? 'product' : 'products'}`
              : ' '}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost btn-sm md:hidden"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            className="input min-h-9 w-auto rounded-full py-1 text-sm"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[210px_1fr]">
        <aside
          className={clsx('space-y-7', !showFilters && 'hidden md:block')}
          aria-label="Filters"
        >
          <div>
            <p className="label">Category</p>
            <ul className="space-y-0.5">
              {[
                {
                  slug: undefined,
                  name: 'All products',
                  productCount: undefined,
                },
                ...(categories ?? []),
              ].map((c) => (
                <li key={c.slug ?? 'all'}>
                  <button
                    className={clsx(
                      'flex w-full justify-between rounded-lg px-3 py-1.5 text-left text-[15px]',
                      filters.category === c.slug
                        ? 'bg-ink font-bold text-paper'
                        : 'hover:bg-paper-2',
                    )}
                    onClick={() => update({ category: c.slug })}
                  >
                    {c.name}
                    {c.productCount !== undefined && (
                      <span className="opacity-60">{c.productCount}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">Price</p>
            <div className="space-y-1">
              {PRICE_RANGES.map((r, i) => (
                <label
                  key={r.label}
                  className="flex cursor-pointer items-center gap-2.5 text-[15px]"
                >
                  <input
                    type="radio"
                    name="price"
                    className="size-4 accent-ink"
                    checked={priceIndex === i || (priceIndex === -1 && i === 0)}
                    onChange={() =>
                      update({ min: r.min?.toString(), max: r.max?.toString() })
                    }
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-ink"
              checked={Boolean(filters.inStock)}
              onChange={(e) =>
                update({ inStock: e.target.checked ? 'true' : undefined })
              }
            />
            In stock only
          </label>

          {hasFilters && (
            <button
              className="btn-ghost btn-sm"
              onClick={() =>
                update({
                  search: undefined,
                  category: undefined,
                  min: undefined,
                  max: undefined,
                  inStock: undefined,
                })
              }
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </aside>

        <section aria-live="polite" aria-busy={isFetching}>
          {error && <Alert>{error.message}</Alert>}
          {cart.error && (
            <div className="mb-4">
              <Alert>{cart.error.message}</Alert>
            </div>
          )}
          {isLoading ? (
            <Spinner label="Loading products…" />
          ) : data && data.data.length === 0 ? (
            <Empty title="Nothing matches">
              Try another search or clear the filters.
            </Empty>
          ) : (
            <div
              className={clsx(
                'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3',
                isFetching && 'opacity-60 transition-opacity',
              )}
            >
              {data?.data.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  inCart={cart.inCart(p.id)}
                  onAdd={() => cart.add(p)}
                  adding={cart.pending}
                />
              ))}
            </div>
          )}
          {data && (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPage={(page) => update({ page: String(page) })}
            />
          )}
        </section>
      </div>
    </>
  );
}
