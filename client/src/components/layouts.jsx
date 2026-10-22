import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUp,
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
import Logo, { LogoMark } from './Logo.jsx';
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
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const onLanding = pathname === '/';

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const updateScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0);
      setScrolled(window.scrollY > 4);
      setShowTop(window.scrollY > 700);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (!onLanding || !('IntersectionObserver' in window)) {
      setActiveSection('');
      return undefined;
    }
    const sections = ['features', 'how-it-works', 'privacy']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.2, 0.5, 0.8] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [onLanding]);

  const anchors = [
    ['Features', '/#features'],
    ['How it works', '/#how-it-works'],
    ['Privacy', '/#privacy'],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <div className="public-scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />
      <header className={`public-header sticky top-0 z-30 border-b border-line bg-canvas ${scrolled ? 'is-scrolled' : ''}`}>
        <div className={`container-page ${onLanding ? 'max-w-7xl' : ''} flex h-[72px] items-center justify-between`}>
          <Logo />
          {onLanding ? (
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {anchors.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  aria-current={activeSection === href.split('#')[1] ? 'location' : undefined}
                  className="public-anchor relative rounded-md px-3 py-3 text-sm font-medium text-muted hover:text-secondary"
                >
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
            className="btn btn-ghost -mr-2 size-11 px-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="public-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open ? (
          <div id="public-menu" className="public-menu-enter border-t border-line bg-canvas md:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {onLanding
                ? anchors.map(([label, href]) => (
                    <a key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-tint">
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

      <main id="main" className="route-view flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className={`container-page ${onLanding ? 'max-w-7xl' : ''} flex flex-col justify-between gap-6 py-8 sm:flex-row sm:items-center`}>
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-auto object-contain" />
            <p className="text-xs text-muted">Designed with care. Built with code.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <a className="hover:text-secondary" href="/#features">Features</a>
            <a className="hover:text-secondary" href="/#how-it-works">How it works</a>
            <a className="hover:text-secondary" href="/#privacy">Privacy</a>
            <Link className="hover:text-secondary" to="/login">Sign in</Link>
            <Link className="hover:text-secondary" to="/register">Create account</Link>
          </nav>
          <button type="button" className="back-top-footer" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="border-t border-line">
          <div className={`container-page ${onLanding ? 'max-w-7xl' : ''} flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between`}>
            <p>© {new Date().getFullYear()} Rembrio. Built by <a className="text-secondary underline-offset-4 hover:underline" href="https://myportfolio-i6su.onrender.com">Shashank Jaiswal</a>.</p>
            <p>AI answers can contain mistakes — verify important facts against the cited pages.</p>
          </div>
        </div>
      </footer>
      {showTop ? (
        <button
          type="button"
          className="back-top-floating"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      ) : null}
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
    `app-nav-item relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'is-active bg-tint text-ink' : 'text-muted hover:bg-tint hover:text-ink'
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
          <Logo to="/dashboard" className="h-11 w-auto object-contain" />
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

        <main id="main" className="route-view mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
