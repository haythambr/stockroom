import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { OrderStatus } from '../api/types';
import { STATUS_LABEL } from '../lib/format';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-16 text-ink-3"
      role="status"
    >
      <Loader2 className="animate-spin" size={20} /> {label}
    </div>
  );
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'warn';
  children: ReactNode;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold',
        tone === 'error' && 'bg-rose-tint text-rose',
        tone === 'success' && 'bg-moss-tint text-moss',
        tone === 'warn' && 'bg-amber-tint text-amber',
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-tint text-amber',
  PAID: 'bg-sky-tint text-sky',
  SHIPPED: 'bg-ember-tint text-ember-dark',
  DELIVERED: 'bg-moss-tint text-moss',
  CANCELLED: 'bg-paper-2 text-ink-3',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap',
        STATUS_STYLE[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="mt-8 flex items-center justify-center gap-3"
      aria-label="Pages"
    >
      <button
        className="btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-bold text-ink-2">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="mt-2 text-ink-2">{children}</div>}
    </div>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-full border-[1.5px] border-line bg-card">
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full text-lg font-bold hover:bg-paper-2 disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="One fewer"
      >
        −
      </button>
      <span
        className="w-8 text-center font-bold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full text-lg font-bold hover:bg-paper-2 disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="One more"
      >
        +
      </button>
    </div>
  );
}
