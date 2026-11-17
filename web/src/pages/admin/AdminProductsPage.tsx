import clsx from 'clsx';
import { History, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  useAdjustStock,
  useAdminProducts,
  useSetProductActive,
  useStockHistory,
} from '../../api/hooks';
import type { Product } from '../../api/types';
import { ProductArt } from '../../components/ProductArt';
import { Alert, Pagination, Spinner } from '../../components/ui';
import { dateTime, money } from '../../lib/format';

const REASON_LABEL = {
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Correction',
  ORDER: 'Order',
  CANCEL: 'Cancelled order',
} as const;

/** Side panel: change the stock count (logged) and see the last changes. */
function StockPanel({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [change, setChange] = useState('');
  const [note, setNote] = useState('');
  const adjust = useAdjustStock();
  const { data: history, isLoading } = useStockHistory(product.id);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    adjust.mutate(
      { id: product.id, change: Number(change), note: note || undefined },
      {
        onSuccess: () => {
          setChange('');
          setNote('');
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/30"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Stock for ${product.name}`}
        className="h-full w-full max-w-md overflow-y-auto bg-paper p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{product.sku}</p>
            <h2 className="font-display text-3xl">{product.name}</h2>
            <p className="mt-1 text-ink-2">
              <strong className="text-2xl text-ink tabular-nums">
                {product.stock}
              </strong>{' '}
              in stock
            </p>
          </div>
          <button
            className="grid size-9 place-items-center rounded-full hover:bg-paper-2"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="card mt-6 space-y-3 p-5">
          <p className="font-bold">Change stock</p>
          {adjust.error && <Alert>{adjust.error.message}</Alert>}
          {adjust.isSuccess && <Alert tone="success">Saved and logged.</Alert>}
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="+12 or −2"
              aria-label="Units to add or remove"
              value={change}
              onChange={(e) => setChange(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Note, e.g. delivery 4471"
              aria-label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            className="btn-primary btn-sm w-full"
            disabled={!change || Number(change) === 0 || adjust.isPending}
          >
            {Number(change) < 0
              ? `Remove ${-Number(change)}`
              : Number(change) > 0
                ? `Add ${change}`
                : 'Save'}
          </button>
        </form>

        <h3 className="mt-8 mb-3 flex items-center gap-2 font-bold">
          <History size={16} /> Stock history
        </h3>
        {isLoading ? (
          <Spinner />
        ) : (
          <ol className="space-y-2">
            {history?.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-card px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-bold">{REASON_LABEL[m.reason]}</p>
                  <p className="text-xs text-ink-3">
                    {dateTime(m.createdAt)}
                    {m.note && ` · ${m.note}`}
                  </p>
                </div>
                <span
                  className={clsx(
                    'font-extrabold tabular-nums',
                    m.change > 0 ? 'text-moss' : 'text-rose',
                  )}
                >
                  {m.change > 0 ? '+' : ''}
                  {m.change}
                </span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAdminProducts({
    page,
    limit: 12,
    sort: 'name',
    search: search || undefined,
  });
  const setActive = useSetProductActive();
  const [open, setOpen] = useState<Product | null>(null);
  const current = open && data?.data.find((p) => p.id === open.id);

  return (
    <>
      <input
        className="input mb-5 max-w-sm"
        type="search"
        placeholder="Find a product"
        aria-label="Find a product"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {error && <Alert>{error.message}</Alert>}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wider text-ink-3 uppercase">
                <th className="px-5 py-3">Product</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3">On sale</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.data.map((p) => (
                <tr key={p.id} className={clsx(!p.isActive && 'opacity-55')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProductArt
                        name={p.name}
                        category={p.category.slug}
                        className="size-11 shrink-0 rounded-lg"
                        iconSize={22}
                      />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-ink-3">
                          {p.sku} · {p.category.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(p.priceCents)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={clsx(
                        'font-extrabold tabular-nums',
                        p.stock === 0 && 'text-rose',
                        p.stock > 0 && p.stock <= 3 && 'text-ember-dark',
                      )}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-ink"
                        checked={Boolean(p.isActive)}
                        onChange={(e) =>
                          setActive.mutate({
                            id: p.id,
                            isActive: e.target.checked,
                          })
                        }
                        aria-label={`${p.name} on sale`}
                      />
                      <span className="text-sm text-ink-2">
                        {p.isActive ? 'Yes' : 'Hidden'}
                      </span>
                    </label>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => setOpen(p)}
                    >
                      Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPage={setPage}
        />
      )}
      {current && (
        <StockPanel product={current} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
