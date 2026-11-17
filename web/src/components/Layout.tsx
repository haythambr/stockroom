import clsx from 'clsx';
import {
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useCart } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 font-display text-2xl tracking-tight"
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#1B1B18" />
        <path d="M9 12h14l-1.5 11h-11z" fill="#E8642C" />
        <path
          d="M12.5 12a3.5 3.5 0 0 1 7 0"
          fill="none"
          stroke="#F6F3EC"
          strokeWidth="2"
        />
      </svg>
      Stockroom
    </Link>
  );
}

function SearchBox() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [term, setTerm] = useState(params.get('search') ?? '');

  useEffect(() => {
    if (location.pathname === '/') setTerm(params.get('search') ?? '');
  }, [params, location.pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(
      location.pathname === '/' ? params : undefined,
    );
    if (term.trim()) next.set('search', term.trim());
    else next.delete('search');
    next.delete('page');
    navigate(`/?${next.toString()}`);
  };

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-md">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
      />
      <input
        className="input min-h-10 rounded-full pl-10"
        type="search"
        placeholder="Search mugs, lamps, bags…"
        aria-label="Search products"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
    </form>
  );
}

function CartLink() {
  const { user } = useAuth();
  const { data } = useCart(user !== null);
  const count = data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <Link
      to="/cart"
      className="relative grid size-10 place-items-center rounded-full hover:bg-paper-2"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag size={21} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-ember px-1 text-[11px] font-extrabold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  if (!user) {
    return (
      <Link
        to="/login"
        state={{ from: location.pathname + location.search }}
        className="btn-primary btn-sm"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-paper-2"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-ink text-sm font-bold text-paper">
          {user.name.charAt(0)}
        </span>
        <span className="hidden text-sm font-bold sm:inline">
          {user.name.split(' ')[0]}
        </span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 z-30 mt-2 w-56 p-1.5">
          <p className="px-3 pt-2 pb-1 text-xs text-ink-3">{user.email}</p>
          <Link
            role="menuitem"
            to="/orders"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-paper"
          >
            <Package size={16} /> My orders
          </Link>
          {user.role === 'ADMIN' && (
            <Link
              role="menuitem"
              to="/admin/orders"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-paper"
            >
              <ShieldCheck size={16} /> Admin
            </Link>
          )}
          <button
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-paper"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-3 py-1.5 text-sm font-bold',
                  isActive ? 'bg-paper-2' : 'text-ink-2 hover:text-ink',
                )
              }
            >
              Shop
            </NavLink>
            {user && (
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  clsx(
                    'rounded-full px-3 py-1.5 text-sm font-bold',
                    isActive ? 'bg-paper-2' : 'text-ink-2 hover:text-ink',
                  )
                }
              >
                Orders
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  clsx(
                    'rounded-full px-3 py-1.5 text-sm font-bold',
                    isActive ? 'bg-paper-2' : 'text-ink-2 hover:text-ink',
                  )
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto hidden flex-1 justify-end lg:flex">
            <SearchBox />
          </div>
          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <CartLink />
            <AccountMenu />
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <SearchBox />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-3 sm:px-6">
          <span>Stockroom, a demo shop. No real orders or payments.</span>
          <span className="flex items-center gap-1.5">
            <UserIcon size={14} /> Try{' '}
            <code className="font-semibold text-ink-2">
              customer@stockroom.test
            </code>{' '}
            / <code className="font-semibold text-ink-2">password123</code>
          </span>
        </div>
      </footer>
    </div>
  );
}
