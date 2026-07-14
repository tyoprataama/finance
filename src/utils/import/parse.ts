// ============================================================
// Parser impor transaksi dari file Excel (.xlsx) atau CSV.
// Mengenali kolom secara fleksibel (Tanggal, Tipe, Kategori,
// Catatan, Nominal, atau kolom terpisah Pemasukan/Pengeluaran).
// Mendukung juga hasil ekspor Excel aplikasi ini sendiri.
// ============================================================
import { MONTHS_ID } from '../format'
import type { TxType } from '../../types'

export interface ParsedRow {
  date: string // YYYY-MM-DD
  type: TxType
  amount: number
  category: string // '' jika tanpa kategori
  note: string
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
  skipped: number
}

interface Cols {
  date?: number
  type?: number
  category?: number
  note?: number
  amount?: number
  income?: number
  expense?: number
}

function pad(v: string | number): string {
  return String(v).padStart(2, '0')
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Ambil nilai teks dari sebuah cell exceljs (string, angka, Date, rich text, formula). */
function cellText(v: any): any {
  if (v == null) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text
    if (v.result != null) return v.result
    if (Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join('')
    return ''
  }
  return v
}

function norm(v: any): string {
  return String(v ?? '').trim()
}

function parseAmount(v: any): number {
  if (typeof v === 'number') return Math.abs(Math.round(v))
  const digits = norm(v).replace(/[^0-9]/g, '')
  if (!digits) return 0
  return Math.abs(Math.round(Number(digits)))
}

function parseDate(v: any): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return isoLocal(v)
  const s = norm(v)
  if (!s) return null

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    let year = m[3]
    if (year.length === 2) year = `20${year}`
    return `${year}-${pad(m[2])}-${pad(m[1])}`
  }

  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const idx = MONTHS_ID.findIndex((mn) => mn.toLowerCase() === m![2].toLowerCase())
    if (idx >= 0) return `${m[3]}-${pad(idx + 1)}-${pad(m![1])}`
  }

  const d = new Date(s)
  if (!isNaN(d.getTime())) return isoLocal(d)
  return null
}

function detectColumns(header: string[]): Cols {
  const cols: Cols = {}
  header.forEach((raw, i) => {
    const h = raw.toLowerCase()
    if (!h) return
    if (cols.date == null && (h.includes('tanggal') || h === 'date' || h.includes('tgl')))
      cols.date = i
    else if (
      cols.income == null &&
      (h.includes('pemasukan') || h.includes('income') || h === 'masuk')
    )
      cols.income = i
    else if (
      cols.expense == null &&
      (h.includes('pengeluaran') || h.includes('expense') || h === 'keluar')
    )
      cols.expense = i
    else if (cols.type == null && (h.includes('tipe') || h.includes('type') || h.includes('jenis')))
      cols.type = i
    else if (cols.category == null && (h.includes('kategori') || h.includes('category')))
      cols.category = i
    else if (
      cols.note == null &&
      (h.includes('catatan') ||
        h.includes('note') ||
        h.includes('keterangan') ||
        h.includes('deskripsi') ||
        h.includes('description'))
    )
      cols.note = i
    else if (
      cols.amount == null &&
      (h.includes('nominal') ||
        h.includes('jumlah') ||
        h.includes('amount') ||
        h.includes('nilai'))
    )
      cols.amount = i
  })
  return cols
}

function parseMatrix(matrix: any[][]): ParseResult {
  const errors: string[] = []
  let headerIdx = -1
  let cols: Cols = {}

  const limit = Math.min(matrix.length, 40)
  for (let i = 0; i < limit; i++) {
    const header = (matrix[i] ?? []).map((c) => norm(cellText(c)))
    const detected = detectColumns(header)
    if (
      detected.date != null &&
      (detected.amount != null || detected.income != null || detected.expense != null)
    ) {
      headerIdx = i
      cols = detected
      break
    }
  }

  if (headerIdx === -1) {
    return {
      rows: [],
      errors: [
        'Tidak menemukan judul kolom. Pastikan file memiliki kolom Tanggal dan Nominal (atau Pemasukan/Pengeluaran).',
      ],
      skipped: 0,
    }
  }

  const rows: ParsedRow[] = []
  let skipped = 0

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? []
    const isEmpty = raw.every((c) => norm(cellText(c)) === '')
    if (isEmpty) continue

    const at = (idx?: number) => (idx == null ? '' : cellText(raw[idx]))

    const categoryRaw = norm(at(cols.category))
    if (categoryRaw.toLowerCase() === 'total') continue

    const dateStr = parseDate(at(cols.date))
    if (!dateStr) {
      skipped++
      continue
    }

    let type: TxType
    let amount: number
    if (cols.income != null || cols.expense != null) {
      const inc = parseAmount(at(cols.income))
      const exp = parseAmount(at(cols.expense))
      if (inc > 0) {
        type = 'income'
        amount = inc
      } else if (exp > 0) {
        type = 'expense'
        amount = exp
      } else {
        continue // baris total / kosong
      }
    } else {
      amount = parseAmount(at(cols.amount))
      if (amount <= 0) {
        skipped++
        continue
      }
      const t = norm(at(cols.type)).toLowerCase()
      type = /masuk|income|pemasukan|debit|kredit/.test(t) ? 'income' : 'expense'
    }

    rows.push({
      date: dateStr,
      type,
      amount,
      category: categoryRaw,
      note: norm(at(cols.note)),
    })
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('Tidak ada baris transaksi yang valid ditemukan.')
  }
  return { rows, errors, skipped }
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  const tabs = (firstLine.match(/\t/g) ?? []).length
  if (tabs > commas && tabs > semis) return '\t'
  if (semis > commas) return ';'
  return ','
}

function csvToMatrix(text: string): string[][] {
  const delim = detectDelimiter(text)
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      cur.push(field)
      field = ''
    } else if (ch === '\n') {
      cur.push(field)
      rows.push(cur)
      cur = []
      field = ''
    } else if (ch === '\r') {
      // abaikan
    } else {
      field += ch
    }
  }
  if (field !== '' || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }
  return rows
}

/** Baca & parse file yang diunggah user. */
export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text()
    return parseMatrix(csvToMatrix(text))
  }

  const buf = await file.arrayBuffer()
  const mod = await import('exceljs')
  const ExcelJS: any = (mod as any).default ?? mod
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets[0]
  if (!ws) return { rows: [], errors: ['File tidak memiliki lembar kerja.'], skipped: 0 }

  const matrix: any[][] = []
  ws.eachRow({ includeEmpty: true }, (row: any) => {
    const values = (row.values as any[]) ?? []
    matrix.push(values.slice(1)) // row.values berbasis 1; index 0 kosong
  })
  return parseMatrix(matrix)
}

/** Contoh template CSV untuk diunduh user. */
export function importTemplateCsv(): string {
  const header = ['Tanggal', 'Tipe', 'Kategori', 'Catatan', 'Nominal']
  const sample = [
    ['2026-01-05', 'Pengeluaran', 'Makan', 'Makan siang', '25000'],
    ['2026-01-10', 'Pemasukan', 'Gaji', 'Gaji bulanan', '5000000'],
    ['2026-01-12', 'Pengeluaran', 'Transport', 'Bensin', '50000'],
  ]
  return [header, ...sample].map((r) => r.join(',')).join('\n')
}
