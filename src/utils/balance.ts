import type { Transaction } from '../types'

/** Month key in 'YYYY-MM' form. month is 0-based. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Resolve the opening balance ("sisa bulan lalu") for a given month.
 *
 * - If an explicit override exists for that month, it is used (editable value).
 * - Otherwise the balance is chained forward as a running ledger from the
 *   earliest month, applying any overrides encountered along the way. This
 *   mirrors the workflow where each month's leftover carries into the next.
 */
export function resolveOpening(
  transactions: Transaction[],
  overrides: Record<string, number>,
  year: number,
  month: number,
): { opening: number; isOverride: boolean } {
  const target = monthKey(year, month)
  if (overrides[target] != null) {
    return { opening: overrides[target], isOverride: true }
  }

  const net = new Map<string, number>()
  let earliest = target
  for (const t of transactions) {
    const k = t.date.slice(0, 7)
    const delta = t.type === 'income' ? Number(t.amount) : -Number(t.amount)
    net.set(k, (net.get(k) ?? 0) + delta)
    if (k < earliest) earliest = k
  }
  for (const k of Object.keys(overrides)) {
    if (k < earliest) earliest = k
  }

  let opening = 0
  let y = Number(earliest.slice(0, 4))
  let m = Number(earliest.slice(5, 7))
  for (let guard = 0; guard < 100000; guard++) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    if (k === target) break
    const openThis = overrides[k] != null ? overrides[k] : opening
    opening = openThis + (net.get(k) ?? 0)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return { opening, isOverride: false }
}

/**
 * Running balance immediately BEFORE a given date, consistent with the monthly
 * ledger above. Used as the opening balance for arbitrary export ranges
 * (weekly / custom start-end).
 */
export function balanceBefore(
  transactions: Transaction[],
  overrides: Record<string, number>,
  dateISO: string,
): number {
  const y = Number(dateISO.slice(0, 4))
  const m0 = Number(dateISO.slice(5, 7)) - 1
  const { opening } = resolveOpening(transactions, overrides, y, m0)
  const monthPrefix = dateISO.slice(0, 7)
  let bal = opening
  for (const t of transactions) {
    if (t.date >= dateISO) continue
    if (t.date.slice(0, 7) !== monthPrefix) continue
    bal += t.type === 'income' ? Number(t.amount) : -Number(t.amount)
  }
  return bal
}
