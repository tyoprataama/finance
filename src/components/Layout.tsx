import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  LogOut,
  Wallet,
  Sun,
  Moon,
  FlaskConical,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight, end: false },
  { to: '/kategori', label: 'Kategori', icon: Tags, end: false },
]

function pillClass(isActive: boolean): string {
  const base =
    'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition'
  return isActive
    ? `${base} bg-accent-strong text-white shadow-sm`
    : `${base} text-fg-muted hover:bg-accent-soft hover:text-accent`
}

export default function Layout() {
  const { signOut, demo, exitDemo } = useAuth()
  const { theme, toggle } = useTheme()
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  const handleLogout = () => {
    if (demo) exitDemo()
    else void signOut()
  }

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Floating glass navbar */}
      <header className="fixed inset-x-0 top-4 z-50 px-3">
        <nav className="glass-surface noise-overlay mx-auto flex max-w-content items-center justify-between gap-2 rounded-full px-2 py-2 shadow-glass">
          <div className="flex items-center gap-2 pl-1.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-strong text-white">
              <Wallet size={17} />
            </span>
            <span className="hidden font-display text-base font-semibold tracking-tight sm:block">
              Keuanganku
            </span>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => pillClass(isActive)}
              >
                <item.icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-1 pr-1">
            <button
              onClick={toggle}
              aria-label="Ganti tema"
              className="grid h-9 w-9 place-items-center rounded-full text-fg-muted transition hover:bg-accent-soft hover:text-accent"
            >
              <ThemeIcon size={18} />
            </button>
            <button
              onClick={handleLogout}
              aria-label="Keluar"
              className="grid h-9 w-9 place-items-center rounded-full text-neg transition hover:bg-neg/10"
            >
              <LogOut size={18} />
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-content px-4 pb-20 pt-24 sm:px-6 md:pt-28">
        {demo && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 text-sm text-fg-muted">
              <FlaskConical size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Anda sedang di <b className="text-fg">Mode Demo</b>. Data hanya
                contoh dan tidak tersimpan.
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 self-start whitespace-nowrap rounded-full border border-hairline px-3.5 py-1.5 text-xs font-medium text-fg transition hover:bg-accent-soft hover:text-accent sm:self-auto"
            >
              Keluar Demo
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
