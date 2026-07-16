import type { Category, Transaction } from '../types'
import { formatDateID } from './format'

export interface ReportRow {
  date: string
  typeLabel: string
  category: string
  note: string
  income: number
  expense: number
  balance: number
}

export interface CategoryTotal {
  name: string
  type: 'income' | 'expense'
  count: number
  total: number
  color: string
}

export interface ReportModel {
  appName: string
  title: string
  periodLabel: string
  generatedAt: string
  opening: number
  income: number
  incomeWithCarry: number
  expense: number
  net: number
  closing: number
  rows: ReportRow[]
  byCategory: CategoryTotal[]
}

interface BuildInput {
  transactions: Transaction[]
  categories: Category[]
  periodLabel: string
  opening: number
}

/** Build a shared report model consumed by the Excel/PDF/Word exporters. */
export function buildReport({
  transactions,
  categories,
  periodLabel,
  opening,
}: BuildInput): ReportModel {
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1
  })

  let running = opening
  let income = 0
  let expense = 0
  const rows: ReportRow[] = sorted.map((t) => {
    const amt = Number(t.amount)
    const isInc = t.type === 'income'
    if (isInc) {
      income += amt
      running += amt
    } else {
      expense += amt
      running -= amt
    }
    return {
      date: formatDateID(t.date),
      typeLabel: isInc ? 'Pemasukan' : 'Pengeluaran',
      category: t.category_id
        ? catMap.get(t.category_id)?.name ?? 'Tanpa kategori'
        : 'Tanpa kategori',
      note: t.note ?? '',
      income: isInc ? amt : 0,
      expense: isInc ? 0 : amt,
      balance: running,
    }
  })

  // Tampilkan sisa bulan lalu sebagai baris pertama (dihitung sebagai pemasukan)
  // agar total penjumlahan kolom di tabel sama persis dengan KPI/ringkasan.
  if (opening !== 0) {
    rows.unshift({
      date: 'Saldo awal',
      typeLabel: '—',
      category: 'Sisa bulan lalu',
      note: 'Saldo dibawa dari periode sebelumnya',
      income: opening,
      expense: 0,
      balance: opening,
    })
  }

  const agg = new Map<string, CategoryTotal>()
  sorted.forEach((t) => {
    const cat = t.category_id ? catMap.get(t.category_id) : undefined
    const name = cat?.name ?? 'Tanpa kategori'
    const key = `${t.type}:${name}`
    const cur =
      agg.get(key) ??
      {
        name,
        type: t.type,
        count: 0,
        total: 0,
        color: cat?.color ?? '#7D7A75',
      }
    cur.count += 1
    cur.total += Number(t.amount)
    agg.set(key, cur)
  })
  const byCategory = [...agg.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1
    return b.total - a.total
  })

  return {
    appName: 'Keuanganku',
    title: 'Laporan Keuangan Pribadi',
    periodLabel,
    generatedAt: new Date().toLocaleString('id-ID'),
    opening,
    income,
    incomeWithCarry: opening + income,
    expense,
    net: income - expense,
    closing: opening + income - expense,
    rows,
    byCategory,
  }
}
