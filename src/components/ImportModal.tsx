import { useRef, useState } from 'react'
import {
  Loader2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react'
import Modal from './Modal'
import { parseFile, importTemplateCsv, type ParseResult } from '../utils/import/parse'
import { useImport, type ImportResult } from '../hooks/useImport'
import { saveBlob } from '../utils/export/save'
import { formatIDR, formatDateID } from '../utils/format'
import type { Category } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  onImported: () => void
}

export default function ImportModal({ open, onClose, categories, onImported }: Props) {
  const { importRows, running } = useImport()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFileName('')
    setParsed(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setError(null)
    setResult(null)
    setParsed(null)
    setFileName(file.name)
    setParsing(true)
    try {
      const res = await parseFile(file)
      setParsed(res)
    } catch {
      setError('Gagal membaca file. Pastikan format .xlsx atau .csv yang valid.')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return
    const res = await importRows(parsed.rows, categories)
    setResult(res)
    onImported()
  }

  function downloadTemplate() {
    const blob = new Blob([importTemplateCsv()], {
      type: 'text/csv;charset=utf-8;',
    })
    saveBlob(blob, 'template-import-keuanganku.csv')
  }

  return (
    <Modal open={open} title="Impor Transaksi" onClose={handleClose}>
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-pos/30 bg-pos/10 px-4 py-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-pos" />
            <div className="text-sm">
              <p className="font-semibold text-fg">Impor selesai</p>
              <p className="text-fg-muted">
                {result.imported} transaksi berhasil ditambahkan
                {result.createdCategories > 0
                  ? `, ${result.createdCategories} kategori baru dibuat`
                  : ''}
                {result.skipped > 0 ? `, ${result.skipped} dilewati` : ''}.
              </p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-hairline bg-elevated px-4 py-3 text-xs text-fg-muted">
              <p className="mb-1 font-medium text-fg">Catatan:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 rounded-full border border-hairline py-2.5 text-sm font-medium text-fg transition hover:bg-accent-soft hover:text-accent"
            >
              Impor lagi
            </button>
            <button
              onClick={handleClose}
              className="flex-1 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Selesai
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Unggah file <b className="text-fg">Excel (.xlsx)</b> atau{' '}
            <b className="text-fg">CSV</b>. Pemasukan dan pengeluaran dikenali
            otomatis, dan kategori baru dibuat bila belum ada.
          </p>

          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-canvas px-4 py-8 text-center transition hover:border-accent-strong hover:bg-accent-soft"
          >
            {parsing ? (
              <Loader2 size={24} className="animate-spin text-accent" />
            ) : (
              <UploadCloud size={24} className="text-accent" />
            )}
            <span className="text-sm font-medium text-fg">
              {fileName || 'Pilih file .xlsx atau .csv'}
            </span>
            <span className="text-xs text-fg-muted">Klik untuk memilih file</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />

          {error && (
            <p className="rounded-xl bg-neg/10 px-3 py-2 text-sm text-neg">{error}</p>
          )}

          {parsed && parsed.rows.length > 0 && (
            <>
              <div className="rounded-xl border border-hairline bg-elevated px-4 py-3 text-sm">
                <p className="font-medium text-fg">
                  {parsed.rows.length} transaksi siap diimpor
                </p>
                {parsed.skipped > 0 && (
                  <p className="text-xs text-fg-muted">
                    {parsed.skipped} baris dilewati (tanggal / nominal tidak valid).
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-hairline">
                <table className="w-full text-left text-xs">
                  <thead className="bg-elevated text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tanggal</th>
                      <th className="px-3 py-2 font-medium">Kategori</th>
                      <th className="px-3 py-2 text-right font-medium">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {parsed.rows.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-fg-muted">
                          {formatDateID(r.date)}
                        </td>
                        <td className="px-3 py-2 text-fg">
                          {r.category || 'Tanpa kategori'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium tabular-nums ${
                            r.type === 'income' ? 'text-pos' : 'text-neg'
                          }`}
                        >
                          {r.type === 'income' ? '+' : '\u2212'}
                          {formatIDR(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 6 && (
                  <p className="border-t border-hairline px-3 py-2 text-center text-xs text-fg-muted">
                    +{parsed.rows.length - 6} transaksi lainnya
                  </p>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={running}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {running && <Loader2 size={16} className="animate-spin" />}
                Impor {parsed.rows.length} transaksi
              </button>
            </>
          )}

          {parsed && parsed.rows.length === 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-neg/30 bg-neg/10 px-4 py-3 text-sm text-neg">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Tidak ada transaksi terbaca</p>
                {parsed.errors.map((e, i) => (
                  <p key={i} className="text-xs">
                    {e}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline px-4 py-3">
            <div className="text-xs text-fg-muted">
              <p className="font-medium text-fg">Belum punya format?</p>
              <p>Unduh contoh template CSV lalu isi datanya.</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-accent-soft hover:text-accent"
            >
              <Download size={14} />
              Template
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
