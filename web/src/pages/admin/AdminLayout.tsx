import clsx from 'clsx';
import { Boxes, ReceiptText } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

export function AdminLayout() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold',
      isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2',
    );

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="font-display text-4xl">Back office</h1>
        </div>
        <nav
          className="flex gap-1 rounded-full bg-card p-1 shadow-sm"
          aria-label="Admin sections"
        >
          <NavLink to="/admin/orders" className={tab}>
            <ReceiptText size={16} /> Orders
          </NavLink>
          <NavLink to="/admin/products" className={tab}>
            <Boxes size={16} /> Products &amp; stock
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </>
  );
}
