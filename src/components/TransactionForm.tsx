import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import type { Category, Transaction, TransactionInput, TxType } from '../types'
import { digitsOnly, groupThousands, todayISO } from '../utils/format'

interface Props {
  categories: Category[]
  initial?: Transaction | null
  defaultDate?: string
  onSubmit: (input: TransactionInput) => Promise<string | null>
  onDone: () => void
  onDelete?: () => void | Promise<void>
}

const inputClass =
  'w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/25'

export default function TransactionForm({
  categories,
  initial,
  defaultDate,
  onSubmit,
  onDone,
  onDelete,
}: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  // amount is stored as a digit-only string; displayed with thousands grouping.
  const [amount, setAmount] = useState<string>(
    initial ? digitsOnly(String(initial.amount)) : '',
  )
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ?? '',
  )
  const [date, setDate] = useState<string>(
    initial?.date ?? defaultDate ?? todayISO(),
  )
  const [note, setNote] = useState<string>(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const options = categories.filter((c) => c.type === type)

  useEffect(() => {
    if (categoryId && !options.some((c) => c.id === categoryId)) {
      setCategoryId('')
    }
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Nominal harus lebih dari 0.')
      return
    }
    setSaving(true)
    const err = await onSubmit({
      type,
      amount: value,
      category_id: categoryId || null,
      note: note.trim() || undefined,
      date,
    })
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
        <label className="mb-1.5 block text-sm font-medium text-fg">Nominal</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-muted">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={groupThousands(amount)}
            onChange={(e) => setAmount(digitsOnly(e.target.value))}
            placeholder="0"
            className={`${inputClass} pl-9 text-right font-medium tabular-nums`}
          />
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          Otomatis diformat, mis. 100.000
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Kategori
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Tanpa kategori</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {options.length === 0 && (
          <p className="mt-1 text-xs text-fg-muted">
            Belum ada kategori {type === 'expense' ? 'pengeluaran' : 'pemasukan'}.
            Tambahkan di menu Kategori.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Tanggal</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Catatan (opsional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="mis. Belanja bulanan"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-neg/10 px-3 py-2 text-sm text-neg">{error}</p>
      )}

      {initial ? (
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="flex items-center gap-1.5 rounded-full border border-neg/40 px-4 py-2.5 text-sm font-medium text-neg transition hover:bg-neg/10 disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Hapus
            </button>
          )}
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Simpan Perubahan
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tambah Transaksi
        </button>
      )}
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
