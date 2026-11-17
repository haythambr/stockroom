import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAdminOrders, useSetOrderStatus } from '../../api/hooks';
import type { Order, OrderStatus } from '../../api/types';
import {
  Alert,
  Empty,
  Pagination,
  Spinner,
  StatusBadge,
} from '../../components/ui';
import { dateTime, money, orderNumber, STATUS_LABEL } from '../../lib/format';

const FILTERS: (OrderStatus | '')[] = [
  '',
  'PENDING_PAYMENT',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

/** The next step an admin can take for each status (payment normally comes from the provider). */
const ACTIONS: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string }[]>
> = {
  PENDING_PAYMENT: [{ to: 'PAID', label: 'Mark paid (bank transfer)' }],
  PAID: [{ to: 'SHIPPED', label: 'Mark shipped' }],
  SHIPPED: [{ to: 'DELIVERED', label: 'Mark delivered' }],
};

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const setStatus = useSetOrderStatus();
  const canCancel =
    order.status === 'PENDING_PAYMENT' || order.status === 'PAID';

  return (
    <li>
      <button
        className="grid w-full grid-cols-[90px_1fr_auto] items-center gap-x-4 gap-y-1 p-4 text-left hover:bg-paper sm:grid-cols-[90px_1.2fr_1fr_auto_100px_20px] sm:px-6"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-bold">{orderNumber(order.number)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {order.user?.name}
          </span>
          <span className="block truncate text-xs text-ink-3">
            {order.user?.email}
          </span>
        </span>
        <span className="hidden text-sm text-ink-2 sm:block">
          {dateTime(order.createdAt)}
        </span>
        <StatusBadge status={order.status} />
        <span className="hidden text-right font-extrabold tabular-nums sm:block">
          {money(order.totalCents)}
        </span>
        <ChevronDown
          size={18}
          className={clsx(
            'hidden text-ink-3 transition-transform sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="grid gap-6 border-t border-line bg-paper/60 p-4 sm:grid-cols-[1fr_260px] sm:px-6">
          <div>
            <ul className="space-y-1 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span>
                    {i.quantity} × {i.productName}{' '}
                    <span className="text-ink-3">({i.sku})</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(i.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-2">
              Ship to {order.shippingAddress.fullName},{' '}
              {order.shippingAddress.line1}, {order.shippingAddress.city}{' '}
              {order.shippingAddress.postalCode},{' '}
              {order.shippingAddress.country}
            </p>
            {order.cancelReason && (
              <p className="mt-1 text-sm text-ink-3">
                Cancelled: {order.cancelReason}
              </p>
            )}
          </div>
          <div className="space-y-2">
            {setStatus.error && <Alert>{setStatus.error.message}</Alert>}
            {(ACTIONS[order.status] ?? []).map((a) => (
              <button
                key={a.to}
                className="btn-primary btn-sm w-full"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: order.id, status: a.to })}
              >
                {a.label}
              </button>
            ))}
            {canCancel && (
              <button
                className="btn-danger btn-sm w-full"
                disabled={setStatus.isPending}
                onClick={() =>
                  window.confirm(
                    `Cancel ${orderNumber(order.number)}? Stock goes back on sale.`,
                  ) &&
                  setStatus.mutate({
                    id: order.id,
                    status: 'CANCELLED',
                    reason: 'Cancelled by the shop',
                  })
                }
              >
                Cancel order
              </button>
            )}
            {!ACTIONS[order.status] && !canCancel && (
              <p className="text-sm text-ink-3">
                Nothing left to do for this order.
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAdminOrders(status, page);

  return (
    <>
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by status"
      >
        {FILTERS.map((s) => (
          <button
            key={s || 'all'}
            role="tab"
            aria-selected={status === s}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-bold',
              status === s
                ? 'bg-ink text-paper'
                : 'bg-card text-ink-2 hover:bg-paper-2',
            )}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s ? STATUS_LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      {error && <Alert>{error.message}</Alert>}
      {isLoading ? (
        <Spinner />
      ) : data && data.data.length === 0 ? (
        <Empty title="No orders here" />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data?.data.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
      {data && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPage={setPage}
        />
      )}
    </>
  );
}
