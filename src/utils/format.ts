export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

/** Compact Rupiah for chart axes, e.g. 1,2 jt / 3 rb / 4,5 M */
export function formatCompactIDR(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)} jt`
  if (abs >= 1_000) return `${trim(value / 1_000)} rb`
  return formatNumber(value)
}

function trim(n: number): string {
  return n
    .toLocaleString('id-ID', { maximumFractionDigits: 1 })
    .replace(',0', '')
}

/** Keep only digit characters (for currency inputs). */
export function digitsOnly(s: string): string {
  return s.replace(/[^0-9]/g, '')
}

/** Group a digit string with id-ID thousands separators, e.g. '100000' -> '100.000'. */
export function groupThousands(digits: string): string {
  const clean = digitsOnly(digits)
  if (!clean) return ''
  return Number(clean).toLocaleString('id-ID')
}

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const MONTHS_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export function formatDateID(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

/** Returns today as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

/** First day of a month as YYYY-MM-DD. month is 0-based. */
export function monthStartISO(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/** Last day of a month as YYYY-MM-DD. month is 0-based. */
export function monthEndISO(year: number, month: number): string {
  const d = new Date(year, month + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_ID[month]} ${year}`
}
