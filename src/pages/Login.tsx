import { useState, type FormEvent } from 'react'
import {
  Wallet,
  Loader2,
  Mail,
  Lock,
  TrendingUp,
  PieChart,
  Eye,
  Sun,
  Moon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { isSupabaseConfigured } from '../lib/supabase'

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

const inputClass =
  'w-full rounded-xl border border-hairline bg-canvas py-2.5 pl-10 pr-3 text-sm text-fg outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/25'

export default function Login() {
  const { signIn, enterDemo } = useAuth()
  const { theme, toggle } = useTheme()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError(
        'Supabase belum dikonfigurasi. Isi file .env dulu, atau klik "Lihat UI (Mode Demo)" di bawah.',
      )
      return
    }
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) {
      setError(error)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas px-5 py-10 text-fg">
      {/* Ambient accent glows */}
      <div className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-accent-strong/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-pos/10 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-content items-center justify-center">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-hairline bg-surface shadow-glass lg:grid-cols-2"
        >
          {/* Brand panel: desktop only */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-accent-strong p-10 text-white lg:flex">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
                <Wallet size={20} />
              </span>
              <span className="font-display text-xl font-semibold">
                Keuanganku
              </span>
            </div>
            <div className="relative z-10">
              <h1 className="max-w-sm font-display text-3xl font-semibold leading-tight">
                Kelola pemasukan &amp; pengeluaran dengan tenang.
              </h1>
              <p className="mt-4 max-w-sm text-white/80">
                Catat transaksi, atur kategori, dan pantau arus kas lewat grafik
                bulanan maupun tahunan.
              </p>
              <div className="mt-8 flex gap-6 text-sm">
                <div className="flex items-center gap-2 text-white/90">
                  <TrendingUp size={18} /> Grafik tren
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <PieChart size={18} /> Rincian kategori
                </div>
              </div>
            </div>
            <div className="text-sm text-white/60">
              Data Anda tersimpan aman &amp; privat per akun.
            </div>
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-white/10" />
          </div>

          {/* Form panel */}
          <div className="px-6 py-10 sm:px-10">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5 lg:invisible">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-strong text-white">
                  <Wallet size={20} />
                </span>
                <span className="font-display text-xl font-semibold">
                  Keuanganku
                </span>
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline text-fg-muted transition hover:bg-accent-soft hover:text-accent"
              >
                <ThemeIcon size={18} />
              </button>
            </div>

            <h2 className="font-display text-2xl font-semibold text-fg">
              Masuk ke akun
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Masuk untuk melihat catatan keuangan Anda.
            </p>

            {!isSupabaseConfigured && (
              <div className="mt-5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
                Supabase belum dikonfigurasi. Anda tetap bisa menjelajahi
                tampilan lewat <b>Mode Demo</b> di bawah.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                  />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Kata sandi
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-neg/10 px-3 py-2 text-sm text-neg">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Masuk
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-fg-muted">
              <span className="h-px flex-1 bg-hairline" />
              atau
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <button
              type="button"
              onClick={enterDemo}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-canvas py-2.5 text-sm font-semibold text-fg transition hover:bg-accent-soft hover:text-accent"
            >
              <Eye size={16} /> Lihat UI tanpa login (Mode Demo)
            </button>
            <p className="mt-2 text-center text-xs text-fg-muted">
              Mode Demo memakai data contoh di browser, tanpa Supabase.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
