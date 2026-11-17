import clsx from 'clsx';
import {
  ArrowLeft,
  Check,
  CreditCard,
  PackageCheck,
  Truck,
  X,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useCancelOrder, useDemoPay, useOrder } from '../api/hooks';
import type { Order } from '../api/types';
import { Alert, Spinner, StatusBadge } from '../components/ui';
import { dateTime, money, orderNumber } from '../lib/format';

const STEPS = [
  { key: 'createdAt', label: 'Placed', icon: Check },
  { key: 'paidAt', label: 'Paid', icon: CreditCard },
  { key: 'shippedAt', label: 'Shipped', icon: Truck },
  { key: 'deliveredAt', label: 'Delivered', icon: PackageCheck },
] as const;

function Timeline({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-paper-2 p-4">
        <X className="mt-0.5 text-ink-3" size={20} />
        <div>
          <p className="font-bold">
            Cancelled {order.cancelledAt && dateTime(order.cancelledAt)}
          </p>
          <p className="text-sm text-ink-2">
            {order.cancelReason}. The items went back on sale.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map(({ key, label, icon: Icon }) => {
        const at = order[key];
        return (
          <li
            key={key}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span
              className={clsx(
                'grid size-10 place-items-center rounded-full',
                at
                  ? 'bg-ink text-paper'
                  : 'border-2 border-dashed border-line text-ink-3',
              )}
            >
              <Icon size={18} />
            </span>
            <span className={clsx('text-sm font-bold', !at && 'text-ink-3')}>
              {label}
            </span>
            <span className="text-xs text-ink-3">
              {at ? dateTime(at) : ' '}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { data: order, isLoading, error } = useOrder(id);
  const pay = useDemoPay();
  const cancel = useCancelOrder();

  if (isLoading) return <Spinner />;
  if (error || !order)
    return <Alert>{error?.message ?? 'Order not found.'}</Alert>;

  const placed = (location.state as { placed?: boolean } | null)?.placed;
  const canCancel =
    order.status === 'PENDING_PAYMENT' || order.status === 'PAID';
  const a = order.shippingAddress;

  return (
    <>
      <Link
        to="/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={16} /> All orders
      </Link>

      {placed && order.status === 'PENDING_PAYMENT' && (
        <div className="mb-6">
          <Alert tone="success">
            Order placed. Your items are reserved until{' '}
            {dateTime(order.expiresAt)}, so pay before then to keep them.
          </Alert>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">
          Order {orderNumber(order.number)}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-6">
            <Timeline order={order} />
          </section>

          <section className="card divide-y divide-line">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 p-4 sm:px-6"
              >
                <div>
                  <p className="font-bold">{item.productName}</p>
                  <p className="text-sm text-ink-3">
                    {item.quantity} × {money(item.unitPriceCents)} · {item.sku}
                  </p>
                </div>
                <p className="font-extrabold tabular-nums">
                  {money(item.lineTotalCents)}
                </p>
              </div>
            ))}
            <dl className="space-y-1.5 p-4 text-[15px] sm:px-6">
              <div className="flex justify-between">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shippingCents ? money(order.shippingCents) : 'Free'}
                </dd>
              </div>
              <div className="flex justify-between text-lg font-extrabold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.totalCents)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          {order.status === 'PENDING_PAYMENT' && (
            <section className="card p-6">
              <h2 className="font-display text-2xl">Payment</h2>
              <p className="mt-2 text-sm text-ink-2">
                This is a demo shop. The button below plays the payment
                provider: it sends a signed payment event to the API, just like
                a real one would.
              </p>
              {pay.error && (
                <div className="mt-3">
                  <Alert>{pay.error.message}</Alert>
                </div>
              )}
              <button
                className="btn-ember mt-4 w-full"
                onClick={() => pay.mutate(order.id)}
                disabled={pay.isPending}
              >
                <CreditCard size={18} />{' '}
                {pay.isPending
                  ? 'Paying…'
                  : `Pay ${money(order.totalCents)} (demo)`}
              </button>
            </section>
          )}

          <section className="card p-6 text-[15px]">
            <h2 className="mb-2 font-bold">Ship to</h2>
            <address className="leading-relaxed text-ink-2 not-italic">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city} {a.postalCode}
              <br />
              {a.country}
            </address>
          </section>

          {canCancel && (
            <div>
              {cancel.error && <Alert>{cancel.error.message}</Alert>}
              <button
                className="btn-danger w-full"
                disabled={cancel.isPending}
                onClick={() =>
                  window.confirm(
                    'Cancel this order? The items go back on sale.',
                  ) && cancel.mutate(order.id)
                }
              >
                Cancel order
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
