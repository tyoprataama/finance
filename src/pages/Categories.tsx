import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2, Pencil, Loader2, Tag } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useTransactions } from '../hooks/useTransactions'
import Modal from '../components/Modal'
import { FadeIn } from '../components/FadeUp'
import { formatIDR } from '../utils/format'
import type { Category, TxType } from '../types'

const PALETTE = [
  '#5E9FE8', '#46A171', '#EAC26B', '#DE9255', '#BF8EDA',
  '#DF84A8', '#4FB9C9', '#E56458', '#7D7A75', '#2783DE',
]

const inputClass =
  'w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/25'

function swatch(color: string) {
  return { backgroundColor: color }
}

export default function CategoriesPage() {
  const { categories, loading, addCategory, updateCategory, deleteCategory } =
    useCategories()
  const { transactions } = useTransactions()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const totals = useMemo(() => {
    const m = new Map<string, number>()
    transactions.forEach((t) => {
      if (!t.category_id) return
      m.set(t.category_id, (m.get(t.category_id) ?? 0) + Number(t.amount))
    })
    return m
  }, [transactions])

  const income = categories.filter((c) => c.type === 'income')
  const expense = categories.filter((c) => c.type === 'expense')

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  async function handleDelete(c: Category) {
    if (
      confirm(
        `Hapus kategori "${c.name}"? Transaksi terkait akan menjadi tanpa kategori.`,
      )
    ) {
      await deleteCategory(c.id)
    }
  }

  return (
    <div className="space-y-6">
      <FadeIn className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Kategori
          </h1>
          <p className="text-sm text-fg-muted">
            Kelompokkan transaksi untuk filter &amp; grafik.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:px-4"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </FadeIn>

      {loading ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-hairline bg-surface text-fg-muted">
          Memuat…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CategoryColumn
            title="Pemasukan"
            accent="text-pos"
            items={income}
            totals={totals}
            onEdit={(c) => {
              setEditing(c)
              setOpen(true)
            }}
            onDelete={handleDelete}
          />
          <CategoryColumn
            title="Pengeluaran"
            accent="text-neg"
            items={expense}
            totals={totals}
            onEdit={(c) => {
              setEditing(c)
              setOpen(true)
            }}
            onDelete={handleDelete}
          />
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Ubah Kategori' : 'Tambah Kategori'}
        onClose={closeModal}
      >
        <CategoryForm
          initial={editing}
          onSubmit={(input) =>
            editing ? updateCategory(editing.id, input) : addCategory(input)
          }
          onDone={closeModal}
        />
      </Modal>
    </div>
  )
}

function CategoryColumn({
  title,
  accent,
  items,
  totals,
  onEdit,
  onDelete,
}: {
  title: string
  accent: string
  items: Category[]
  totals: Map<string, number>
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  return (
    <FadeIn className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
        <span className="text-xs text-fg-muted">{items.length} kategori</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-fg-muted">
          Belum ada kategori.
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                style={swatch(c.color)}
              >
                <Tag size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                <p className="text-xs text-fg-muted">
                  Total: {formatIDR(totals.get(c.id) ?? 0)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onEdit(c)}
                  className="grid h-8 w-8 place-items-center rounded-full text-fg-muted transition hover:bg-accent-soft hover:text-accent"
                  aria-label="Ubah"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(c)}
                  className="grid h-8 w-8 place-items-center rounded-full text-fg-muted transition hover:bg-neg/10 hover:text-neg"
                  aria-label="Hapus"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FadeIn>
  )
}

function CategoryForm({
  initial,
  onSubmit,
  onDone,
}: {
  initial?: Category | null
  onSubmit: (input: {
    name: string
    type: TxType
    color: string
  }) => Promise<string | null>
  onDone: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? PALETTE[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama kategori wajib diisi.')
      return
    }
    setSaving(true)
    const err = await onSubmit({ name: name.trim(), type, color })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={typeBtn(type === 'expense', 'expense')}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={typeBtn(type === 'income', 'income')}
        >
          Pemasukan
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Nama kategori
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Gaji, Makan, Transport"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fg">Warna</label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Warna ${c}`}
              className={`h-8 w-8 rounded-full transition ${
                color === c ? 'ring-2 ring-accent-strong ring-offset-2 ring-offset-surface' : ''
              }`}
              style={swatch(c)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-neg/10 px-3 py-2 text-sm text-neg">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {initial ? 'Simpan Perubahan' : 'Tambah Kategori'}
      </button>
    </form>
  )
}

function typeBtn(active: boolean, type: TxType): string {
  const base = 'rounded-xl border py-2.5 text-sm font-medium transition'
  if (!active) return `${base} border-hairline text-fg-muted hover:text-fg`
  return type === 'expense'
    ? `${base} border-neg/40 bg-neg/10 text-neg`
    : `${base} border-pos/40 bg-pos/10 text-pos`
}
