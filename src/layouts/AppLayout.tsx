import { useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { BrandMark, BrandName } from '@/components/layout/Brand';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

interface Props {
  /** Menu utama — 4 pertama tampil di bottom nav mobile */
  primary: NavItem[];
  /** Menu tambahan — di mobile tampil lewat tombol "Menu" */
  secondary?: NavItem[];
  profilePath: string;
  areaLabel: string;
}

export function AppLayout({ primary, secondary = [], profilePath, areaLabel }: Props) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const mobilePrimary = primary.slice(0, 4);
  const mobileExtra = [...primary.slice(4), ...secondary];
  const extraActive = mobileExtra.some((i) => location.pathname.startsWith(i.to));

  const sideLink = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive ? 'bg-cream text-brand-dark' : 'text-cream/80 hover:bg-white/10 hover:text-cream'
        }`
      }
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  );

  return (
    <div className="min-h-dvh bg-cream-light">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand px-4 py-5 lg:flex print:hidden">
        <Link to={primary[0]?.to ?? '/'} className="mb-6 flex items-center gap-3 px-2">
          <BrandMark tone="cream" />
          <BrandName light />
        </Link>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-cream/60">{areaLabel}</p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {primary.map(sideLink)}
          {secondary.length > 0 && <div className="my-2 border-t border-white/15" />}
          {secondary.map(sideLink)}
        </nav>
        <div className="mt-4 rounded-2xl bg-brand-dark/60 p-3">
          <Link to={profilePath} className="flex items-center gap-3">
            <Avatar name={profile?.full_name} path={profile?.avatar_path} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cream">{profile?.full_name}</p>
              <p className="truncate text-xs text-cream/70">{profile?.outlet?.name ?? (profile?.role === 'admin' ? 'Admin' : '—')}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-semibold text-cream hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand px-4 py-3 lg:hidden print:hidden">
        <Link to={primary[0]?.to ?? '/'} className="flex items-center gap-2.5">
          <BrandMark tone="cream" className="h-9 w-9" />
          <BrandName light />
        </Link>
        <Link to={profilePath} aria-label="Profil">
          <Avatar name={profile?.full_name} path={profile?.avatar_path} size="sm" />
        </Link>
      </header>

      <main className="pb-28 lg:pb-10 lg:pl-64 print:p-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-lg">
          {mobilePrimary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                  isActive ? 'text-brand' : 'text-ink-soft'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-cream' : ''}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
          {mobileExtra.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${extraActive ? 'text-brand' : 'text-ink-soft'}`}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full ${extraActive ? 'bg-cream' : ''}`}>
                <Menu className="h-5 w-5" />
              </span>
              Menu
            </button>
          )}
        </div>
      </nav>

      {/* Sheet menu tambahan (mobile) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setSheetOpen(false)} />
          <div className="pb-safe absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold text-ink">Menu</p>
              <button onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-cream-light" aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...mobileExtra, { to: profilePath, label: 'Profil', icon: UserRound }].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-semibold ${
                      isActive ? 'border-brand/30 bg-cream text-brand-dark' : 'border-line text-ink'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 py-3 text-sm font-semibold text-danger"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
