// ============================================================
// Mode Demo — melihat & mencoba UI TANPA login / tanpa Supabase.
// Data transaksi & kategori memakai DATA CONTOH/DUMMY (demo-seed.json),
// bukan data asli pengguna.
// Perubahan kategori/transaksi hanya di memori (hilang saat refresh);
// nilai "saldo awal" yang diedit manual disimpan di localStorage.
// ============================================================
import type { Category, CategoryInput, Transaction, TransactionInput } from '../types'
import seed from '../data/demo-seed.json'

const DEMO_KEY = 'keuanganku-demo'
const OPEN_KEY = 'keuanganku-demo-openings'

interface SeedCategory {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
}
interface SeedTransaction {
  id: string
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  note: string | null
  date: string
  created_at: string
}
interface SeedFile {
  categories: SeedCategory[]
  transactions: SeedTransaction[]
  openings: Record<string, number>
}

const data = seed as SeedFile

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function setDemoFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    /* ignore */
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function initialCategories(): Category[] {
  return data.categories.map((c) => ({
    id: c.id,
    user_id: 'demo-user',
    name: c.name,
    type: c.type,
    color: c.color,
    icon: null,
    created_at: new Date('2022-01-01T00:00:00').toISOString(),
  }))
}

function initialTransactions(): Transaction[] {
  return data.transactions.map((t) => ({
    id: t.id,
    user_id: 'demo-user',
    category_id: t.category_id,
    type: t.type,
    amount: Number(t.amount),
    note: t.note ?? null,
    date: t.date,
    created_at: t.created_at,
  }))
}

function initialOpenings(): Record<string, number> {
  const base: Record<string, number> = { ...data.openings }
  try {
    const saved = localStorage.getItem(OPEN_KEY)
    if (saved) Object.assign(base, JSON.parse(saved))
  } catch {
    /* ignore */
  }
  return base
}

// ---------- In-memory reactive store ----------
type Listener = () => void
let categories: Category[] = initialCategories()
let transactions: Transaction[] = initialTransactions()
let openings: Record<string, number> = initialOpenings()
const listeners = new Set<Listener>()

function emit(): void {
  listeners.forEach((l) => l())
}

function persistOpenings(): void {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(openings))
  } catch {
    /* ignore */
  }
}

export function subscribeDemo(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDemoCategories(): Category[] {
  return [...categories].sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    return a.name < b.name ? -1 : 1
  })
}

export function getDemoTransactions(): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.created_at < b.created_at ? 1 : -1
  })
}

export function getDemoOpenings(): Record<string, number> {
  return { ...openings }
}

export function demoSetOpening(month: string, amount: number | null): void {
  const next = { ...openings }
  if (amount == null) delete next[month]
  else next[month] = amount
  openings = next
  persistOpenings()
  emit()
}

export function demoAddCategory(input: CategoryInput): string {
  const id = uid()
  categories = [
    ...categories,
    {
      id,
      user_id: 'demo-user',
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon ?? null,
      created_at: new Date().toISOString(),
    },
  ]
  emit()
  return id
}

export function demoUpdateCategory(id: string, patch: Partial<CategoryInput>): void {
  categories = categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
  emit()
}

export function demoDeleteCategory(id: string): void {
  categories = categories.filter((c) => c.id !== id)
  transactions = transactions.map((t) =>
    t.category_id === id ? { ...t, category_id: null } : t,
  )
  emit()
}

export function demoAddTransaction(input: TransactionInput): void {
  transactions = [
    ...transactions,
    {
      id: uid(),
      user_id: 'demo-user',
      category_id: input.category_id,
      type: input.type,
      amount: input.amount,
      note: input.note ?? null,
      date: input.date,
      created_at: new Date().toISOString(),
    },
  ]
  emit()
}

export function demoUpdateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): void {
  transactions = transactions.map((t) => (t.id === id ? { ...t, ...patch } : t))
  emit()
}

export function demoDeleteTransaction(id: string): void {
  transactions = transactions.filter((t) => t.id !== id)
  emit()
}
