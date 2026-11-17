import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../api/hooks';
import {
  Alert,
  Empty,
  Pagination,
  Spinner,
  StatusBadge,
} from '../components/ui';
import { money, orderNumber, shortDate } from '../lib/format';

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useOrders(page);

  if (isLoading) return <Spinner />;
  if (error || !data)
    return <Alert>{error?.message ?? 'Could not load your orders.'}</Alert>;

  return (
    <>
      <h1 className="mb-6 font-display text-4xl">Your orders</h1>
      {data.data.length === 0 ? (
        <Empty title="No orders yet">
          <Link to="/" className="btn-primary mt-4">
            Browse the shop
          </Link>
        </Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {data.data.map((o) => (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 hover:bg-paper sm:px-6"
              >
                <div className="min-w-32">
                  <p className="font-bold">{orderNumber(o.number)}</p>
                  <p className="text-sm text-ink-3">{shortDate(o.createdAt)}</p>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-ink-2">
                  {o.items
                    .map((i) => `${i.quantity} × ${i.productName}`)
                    .join(', ')}
                </p>
                <StatusBadge status={o.status} />
                <p className="w-24 text-right font-extrabold tabular-nums">
                  {money(o.totalCents)}
                </p>
                <ChevronRight size={18} className="text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={data.meta.page}
        totalPages={data.meta.totalPages}
        onPage={setPage}
      />
    </>
  );
}
