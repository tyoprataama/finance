import type { CategoryTotal, ReportModel, ReportRow } from '../report'
import { formatIDR } from '../format'
import { saveBlob } from './save'

// Hex colors (no #)
const BLUE = '3263A6'
const BLUE_DARK = '214E8A'
const POS = '1AA46A'
const NEG = 'D65A52'
const STRIPE = 'EEF3FB'
const WHITE = 'FFFFFF'
const MUTED = '5B6675'

export async function exportWord(
  report: ReportModel,
  filename: string,
): Promise<void> {
  const docx: any = await import('docx')
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    ShadingType,
  } = docx

  const noBorder = {
    top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    left: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    right: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
  }

  const txt = (
    text: string,
    o: { bold?: boolean; color?: string; italics?: boolean; size?: number } = {},
  ) =>
    new TextRun({
      text,
      bold: o.bold,
      italics: o.italics,
      color: o.color,
      size: o.size ?? 20,
      font: 'Calibri',
    })

  const cell = (
    runs: any[],
    o: { fill?: string; align?: any; width?: number } = {},
  ) =>
    new TableCell({
      children: [
        new Paragraph({
          children: runs,
          alignment: o.align,
        }),
      ],
      shading: o.fill
        ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill }
        : undefined,
      width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
    })

  const headerRow = (labels: string[], aligns: any[]) =>
    new TableRow({
      tableHeader: true,
      children: labels.map((l, i) =>
        cell([txt(l, { bold: true, color: WHITE })], {
          fill: BLUE,
          align: aligns[i],
        }),
      ),
    })

  const R = AlignmentType.RIGHT
  const L = AlignmentType.LEFT

  // ---- Transaction table ----
  const txHeader = headerRow(
    ['Tanggal', 'Tipe', 'Kategori', 'Catatan', 'Masuk', 'Keluar', 'Saldo'],
    [L, L, L, L, R, R, R],
  )
  const txRows = report.rows.map((row: ReportRow, idx: number) => {
    const fill = idx % 2 === 1 ? STRIPE : undefined
    return new TableRow({
      children: [
        cell([txt(row.date)], { fill }),
        cell([txt(row.typeLabel)], { fill }),
        cell([txt(row.category)], { fill }),
        cell([txt(row.note)], { fill }),
        cell([txt(row.income ? formatIDR(row.income) : '', { color: row.income ? POS : MUTED })], { fill, align: R }),
        cell([txt(row.expense ? formatIDR(row.expense) : '', { color: row.expense ? NEG : MUTED })], { fill, align: R }),
        cell([txt(formatIDR(row.balance))], { fill, align: R }),
      ],
    })
  })
  const txTotal = new TableRow({
    children: [
      cell([txt('TOTAL', { bold: true, color: WHITE })], { fill: BLUE_DARK }),
      cell([txt('', { color: WHITE })], { fill: BLUE_DARK }),
      cell([txt('', { color: WHITE })], { fill: BLUE_DARK }),
      cell([txt('', { color: WHITE })], { fill: BLUE_DARK }),
      cell([txt(formatIDR(report.incomeWithCarry), { bold: true, color: WHITE })], { fill: BLUE_DARK, align: R }),
      cell([txt(formatIDR(report.expense), { bold: true, color: WHITE })], { fill: BLUE_DARK, align: R }),
      cell([txt(formatIDR(report.closing), { bold: true, color: WHITE })], { fill: BLUE_DARK, align: R }),
    ],
  })
  const txTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [txHeader, ...txRows, txTotal],
  })

  // ---- Category table ----
  const catHeader = headerRow(
    ['Kategori', 'Tipe', 'Transaksi', 'Total'],
    [L, L, R, R],
  )
  const catRows = report.byCategory.map((c: CategoryTotal, idx: number) => {
    const fill = idx % 2 === 1 ? STRIPE : undefined
    return new TableRow({
      children: [
        cell([txt(c.name)], { fill }),
        cell([txt(c.type === 'income' ? 'Pemasukan' : 'Pengeluaran')], { fill }),
        cell([txt(String(c.count))], { fill, align: R }),
        cell([txt(formatIDR(c.total), { color: c.type === 'income' ? POS : NEG })], { fill, align: R }),
      ],
    })
  })
  const catTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [catHeader, ...catRows],
  })

  const summaryLine = (label: string, value: number, color?: string) =>
    new Paragraph({
      children: [
        txt(`${label}: `, { bold: true }),
        txt(formatIDR(value), { color }),
      ],
      spacing: { after: 40 },
    })

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            children: [txt(report.appName, { bold: true, color: BLUE, size: 40 })],
          }),
          new Paragraph({
            children: [txt(report.title, { bold: true, size: 26 })],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [txt(`Periode: ${report.periodLabel}`, { color: MUTED })],
          }),
          new Paragraph({
            children: [txt(`Dibuat: ${report.generatedAt}`, { color: MUTED, italics: true, size: 18 })],
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [txt('Ringkasan', { bold: true, color: BLUE_DARK, size: 26 })],
            spacing: { after: 80 },
          }),
          summaryLine('Total pemasukan', report.incomeWithCarry, POS),
          summaryLine('Total pengeluaran', report.expense, NEG),
          summaryLine('Saldo akhir', report.closing, BLUE_DARK),
          new Paragraph({
            children: [txt('Daftar Transaksi', { bold: true, color: BLUE_DARK, size: 26 })],
            spacing: { before: 200, after: 80 },
          }),
          txTable,
          new Paragraph({
            children: [txt('Rincian per Kategori', { bold: true, color: BLUE_DARK, size: 26 })],
            spacing: { before: 200, after: 80 },
          }),
          catTable,
          new Paragraph({
            children: [txt('Dibuat otomatis oleh Keuanganku.', { color: MUTED, italics: true, size: 16 })],
            spacing: { before: 200 },
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveBlob(blob, filename)
}
