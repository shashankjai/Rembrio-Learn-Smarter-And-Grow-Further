import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import { FullPageSpinner } from './ui/index.jsx';

const SkipLink = () => (
  <a
    href="#main"
    className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
  >
    Skip to content
  </a>
);

/* ----------------------------------------------------------- public pages */

export function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const onLanding = pathname === '/';

  useEffect(() => setOpen(false), [pathname]);

  const anchors = [
    ['Features', '/#features'],
    ['How it works', '/#how-it-works'],
    ['Privacy', '/#privacy'],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="container-page flex h-16 sm:h-20 items-center justify-between">
          <Logo />
          {onLanding ? (
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {anchors.map(([label, href]) => (
                <a key={href} href={href} className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-primary">
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost -mr-2 px-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="public-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open ? (
          <div id="public-menu" className="border-t border-line bg-surface md:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {onLanding
                ? anchors.map(([label, href]) => (
                    <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-canvas">
                      {label}
                    </a>
                  ))
                : null}
              {user ? (
                <Link to="/dashboard" className="btn btn-primary mt-2">
                  Open dashboard
                </Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn btn-secondary">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">Learn smarter. Know more.</p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              An AI study assistant that answers from your own PDFs and shows where each answer came from.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="text-sm font-semibold text-primary">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a className="hover:text-primary" href="/#features">Features</a></li>
              <li><a className="hover:text-primary" href="/#how-it-works">How it works</a></li>
              <li><a className="hover:text-primary" href="/#privacy">Privacy &amp; limits</a></li>
            </ul>
          </nav>
          <nav aria-label="Account">
            <p className="text-sm font-semibold text-primary">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link className="hover:text-primary" to="/login">Sign in</Link></li>
              <li><Link className="hover:text-primary" to="/register">Create account</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line">
          <p className="container-page py-4 text-xs text-muted">
            © {new Date().getFullYear()} Rembrio. Built with React, Express, MongoDB and Google Gemini. AI answers can contain mistakes — verify important facts against the cited pages.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------- authenticated app */

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/assistant', label: 'Study assistant', icon: MessageSquare },
  { to: '/quizzes', label: 'Quizzes', icon: ClipboardCheck },
  { to: '/progress', label: 'Progress', icon: ChartColumn },
  { to: '/study-plans', label: 'Study plans', icon: CalendarCheck },
];

function SideNav({ onNavigate }) {
  const { user, logout } = useAuth();
  const item = ({ isActive }) =>
    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-secondary/10 text-primary' : 'text-muted hover:bg-primary/5 hover:text-primary'
    }`;
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Application" className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={item} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                <Icon className={`size-[18px] ${isActive ? 'text-secondary' : ''}`} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <NavLink to="/profile" className={item} onClick={onNavigate}>
          <UserRound className="size-[18px]" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate">{user?.name}</span>
            <span className="block truncate text-xs font-normal text-muted">{user?.email}</span>
          </span>
        </NavLink>
        <button type="button" onClick={logout} className="btn btn-ghost mt-1 w-full justify-start px-3">
          <LogOut className="size-[18px]" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <SkipLink />
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">
        <div className="flex h-16 sm:h-20 items-center border-b border-line px-5">
          <Logo to="/dashboard" />
        </div>
        <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
          <SideNav />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
          <Logo to="/dashboard" className="h-10 w-auto object-contain" />
          <button
            type="button"
            className="btn btn-ghost -mr-2 px-2"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="app-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>
        {open ? (
          <div id="app-menu" className="fixed inset-x-0 bottom-0 top-14 z-20 overflow-auto bg-surface lg:hidden">
            <SideNav onNavigate={() => setOpen(false)} />
          </div>
        ) : null}

        <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppLayout />;
}

/** Login / register are pointless for a signed-in user. */
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
