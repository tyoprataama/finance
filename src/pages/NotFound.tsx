import { Link } from 'react-router-dom'
import { ArrowLeft, House, SearchX } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[75vh] place-items-center px-4 py-12 text-center">
      <section className="w-full max-w-lg">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-hairline bg-surface text-accent shadow-card">
          <SearchX size={30} strokeWidth={1.6} />
        </div>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-accent">
          Error 404
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-fg-muted sm:text-base">
          Sepertinya halaman yang kamu cari tidak tersedia, sudah dipindahkan,
          atau alamatnya salah.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <House size={17} />
            Kembali ke Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-5 py-3 text-sm font-semibold text-fg transition hover:bg-accent-soft"
          >
            <ArrowLeft size={17} />
            Kembali
          </button>
        </div>
      </section>
    </main>
  )
}
