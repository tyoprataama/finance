import type { ReportModel } from '../report'
import { saveBlob } from './save'

// Palette (ARGB, no leading #)
const BLUE = 'FF3263A6'
const BLUE_DARK = 'FF214E8A'
const POS = 'FF1AA46A'
const NEG = 'FFD65A52'
const STRIPE = 'FFEEF3FB'
const WHITE = 'FFFFFFFF'
const MONEY = '#,##0'

export async function exportExcel(
  report: ReportModel,
  filename: string,
): Promise<void> {
  const mod = await import('exceljs')
  const ExcelJS: any = (mod as any).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = report.appName
  wb.created = new Date()

  const ws = wb.addWorksheet('Laporan')
  const widths = [16, 14, 20, 30, 16, 16, 18]
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  const fill = (color: string) => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color },
  })

  // ---- Title band ----
  ws.mergeCells('A1:G1')
  const t1 = ws.getCell('A1')
  t1.value = `${report.appName}: ${report.title}`
  t1.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE } }
  t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  t1.fill = fill(BLUE)
  ws.getRow(1).height = 30

  ws.mergeCells('A2:G2')
  const t2 = ws.getCell('A2')
  t2.value = `Periode: ${report.periodLabel}`
  t2.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
  t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  t2.fill = fill(BLUE_DARK)
  ws.getRow(2).height = 20

  ws.mergeCells('A3:G3')
  const t3 = ws.getCell('A3')
  t3.value = `Dibuat: ${report.generatedAt}`
  t3.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF5B6675' } }
  t3.alignment = { horizontal: 'left', indent: 1 }

  // ---- Ringkasan ----
  let r = 5
  const head = ws.getCell(`A${r}`)
  head.value = 'Ringkasan'
  head.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLUE_DARK } }
  r += 1

  const summary: Array<[string, number, string?]> = [
    ['Saldo awal (sisa bulan lalu)', report.opening],
    ['Total pemasukan', report.income, POS],
    ['Total pengeluaran', report.expense, NEG],
    ['Selisih (net)', report.net],
    ['Saldo akhir', report.closing],
  ]
  summary.forEach(([label, value, color]) => {
    const kc = ws.getCell(`A${r}`)
    kc.value = label
    kc.font = { name: 'Arial', size: 10, bold: true }
    ws.mergeCells(`B${r}:C${r}`)
    const vc = ws.getCell(`B${r}`)
    vc.value = value
    vc.numFmt = `"Rp" ${MONEY}`
    vc.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: color ? { argb: color } : undefined,
    }
    vc.alignment = { horizontal: 'right' }
    r += 1
  })

  // ---- Transaction table ----
  r += 1
  const theadRow = r
  const headers = [
    'Tanggal',
    'Tipe',
    'Kategori',
    'Catatan',
    'Pemasukan',
    'Pengeluaran',
    'Saldo berjalan',
  ]
  headers.forEach((h, i) => {
    const c = ws.getCell(theadRow, i + 1)
    c.value = h
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    c.fill = fill(BLUE)
    c.alignment = { vertical: 'middle', horizontal: i >= 4 ? 'right' : 'left' }
  })
  ws.getRow(theadRow).height = 20
  r += 1

  report.rows.forEach((row, idx) => {
    const vals = [
      row.date,
      row.typeLabel,
      row.category,
      row.note,
      row.income || null,
      row.expense || null,
      row.balance,
    ]
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1)
      c.value = v as any
      c.font = { name: 'Arial', size: 10 }
      if (i >= 4) {
        c.numFmt = MONEY
        c.alignment = { horizontal: 'right' }
      }
      if (i === 4 && row.income) c.font = { name: 'Arial', size: 10, color: { argb: POS } }
      if (i === 5 && row.expense) c.font = { name: 'Arial', size: 10, color: { argb: NEG } }
      if (idx % 2 === 1) c.fill = fill(STRIPE)
    })
    r += 1
  })

  // Totals row
  const totalRow = r
  ws.mergeCells(`A${totalRow}:D${totalRow}`)
  const tl = ws.getCell(`A${totalRow}`)
  tl.value = 'TOTAL'
  tl.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
  tl.fill = fill(BLUE_DARK)
  tl.alignment = { horizontal: 'right' }
  const totIncome = ws.getCell(totalRow, 5)
  totIncome.value = report.income
  const totExpense = ws.getCell(totalRow, 6)
  totExpense.value = report.expense
  const totBal = ws.getCell(totalRow, 7)
  totBal.value = report.closing
  ;[totIncome, totExpense, totBal].forEach((c) => {
    c.numFmt = MONEY
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    c.fill = fill(BLUE_DARK)
    c.alignment = { horizontal: 'right' }
  })
  r = totalRow + 2

  // ---- Rincian per kategori ----
  const catHead = ws.getCell(`A${r}`)
  catHead.value = 'Rincian per Kategori'
  catHead.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLUE_DARK } }
  r += 1
  const catCols = ['Kategori', 'Tipe', 'Jumlah transaksi', 'Total']
  catCols.forEach((h, i) => {
    const c = ws.getCell(r, i + 1)
    c.value = h
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    c.fill = fill(BLUE)
    c.alignment = { horizontal: i >= 2 ? 'right' : 'left' }
  })
  r += 1
  report.byCategory.forEach((cat, idx) => {
    const vals = [
      cat.name,
      cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      cat.count,
      cat.total,
    ]
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1)
      c.value = v as any
      c.font = {
        name: 'Arial',
        size: 10,
        color:
          i === 3
            ? { argb: cat.type === 'income' ? POS : NEG }
            : undefined,
      }
      if (i >= 2) c.alignment = { horizontal: 'right' }
      if (i === 3) c.numFmt = MONEY
      if (idx % 2 === 1) c.fill = fill(STRIPE)
    })
    r += 1
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveBlob(blob, filename)
}
