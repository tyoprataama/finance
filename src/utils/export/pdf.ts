import type { ReportModel } from '../report'
import { formatIDR } from '../format'

// RGB triplets
const BLUE: [number, number, number] = [50, 99, 166]
const BLUE_DARK: [number, number, number] = [33, 78, 138]
const POS: [number, number, number] = [26, 164, 106]
const NEG: [number, number, number] = [214, 90, 82]
const INK: [number, number, number] = [12, 17, 27]
const MUTED: [number, number, number] = [91, 102, 117]

export async function exportPdf(
  report: ReportModel,
  filename: string,
): Promise<void> {
  const jspdfMod: any = await import('jspdf')
  const JsPdf = jspdfMod.jsPDF ?? jspdfMod.default ?? jspdfMod
  const autoTableMod: any = await import('jspdf-autotable')
  const autoTable = autoTableMod.default ?? autoTableMod

  const doc = new JsPdf({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40

  // ---- Header band ----
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2])
  doc.rect(0, 0, pageW, 76, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(report.appName, margin, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(report.title, margin, 52)
  doc.setFontSize(9)
  doc.text(`Periode: ${report.periodLabel}`, margin, 66)
  // Timestamp saat export (putih agar terlihat di atas header biru)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text(`Dibuat: ${report.generatedAt}`, pageW - margin, 66, { align: 'right' } as any)

  // ---- Summary boxes ----
  const boxes: Array<[string, string, [number, number, number]]> = [
    ['Pemasukan', formatIDR(report.incomeWithCarry), POS],
    ['Pengeluaran', formatIDR(report.expense), NEG],
    ['Saldo akhir', formatIDR(report.closing), BLUE_DARK],
  ]
  const gap = 10
  const boxW = (pageW - margin * 2 - gap * 2) / 3
  const boxY = 92
  const boxH = 52
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + gap)
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(247, 249, 252)
    ;(doc as any).roundedRect(x, boxY, boxW, boxH, 6, 6, 'FD')
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(b[0], x + 10, boxY + 18)
    doc.setTextColor(b[2][0], b[2][1], b[2][2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(b[1], x + 10, boxY + 38)
  })

  const opts: any = {
    startY: boxY + boxH + 18,
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: INK },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 243, 251] },
    theme: 'striped',
    showHead: 'firstPage',
    showFoot: 'lastPage',
    head: [['Tanggal', 'Tipe', 'Kategori', 'Catatan', 'Masuk', 'Keluar', 'Saldo']],
    body: report.rows.map((row) => [
      row.date,
      row.typeLabel,
      row.category,
      row.note,
      row.income ? formatIDR(row.income) : '',
      row.expense ? formatIDR(row.expense) : '',
      formatIDR(row.balance),
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      '',
      formatIDR(report.incomeWithCarry),
      formatIDR(report.expense),
      formatIDR(report.closing),
    ]],
    footStyles: { fillColor: BLUE_DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  }
  autoTable(doc, opts)

  // ---- Category breakdown ----
  const afterY = (doc as any).lastAutoTable?.finalY ?? boxY + boxH + 18
  doc.setTextColor(BLUE_DARK[0], BLUE_DARK[1], BLUE_DARK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Rincian per Kategori', margin, afterY + 24)

  const catOpts: any = {
    startY: afterY + 32,
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: INK },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 243, 251] },
    theme: 'striped',
    head: [['Kategori', 'Tipe', 'Transaksi', 'Total']],
    body: report.byCategory.map((c) => [
      c.name,
      c.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      String(c.count),
      formatIDR(c.total),
    ]),
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
  }
  autoTable(doc, catOpts)

  doc.save(filename)
}
