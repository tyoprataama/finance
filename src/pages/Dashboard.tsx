import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp, ChevronLeft } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import SummaryCards from '../components/SummaryCards'
import { FadeIn } from '../components/FadeUp'
import {
  formatCompactIDR,
  formatIDR,
  formatDateID,
  MONTHS_ID,
  MONTHS_SHORT_ID,
} from '../utils/format'
import type { Transaction } from '../types'

type RangeMode = 'month' | 'year' | 'all' | 'custom'
type Granularity = 'day' | 'month' | 'year'
type PieKind = 'expense' | 'income'

// ---- date helpers ----
function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDaysISO(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}
function keyFor(dateStr: string, g: Granularity): string {
  if (g === 'day') return dateStr
  const d = new Date(`${dateStr}T00:00:00`)
  if (g === 'month')
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
  return String(d.getFullYear())
}

// recharts style constants (avoid inline double-brace props)
const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 }
const axisTick = { fill: 'var(--fg-muted)', fontSize: 11 }
const gridStroke = 'var(--hairline)'
const cursorFill = { fill: 'rgba(120,120,120,0.10)' }
const barRadius: [number, number, number, number] = [6, 6, 0, 0]
const tooltipStyle = {
  borderRadius: 14,
  border: '1px solid var(--hairline)',
  background: 'var(--surface)',
  color: 'var(--fg)',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(0,0,0,.18)',
}
const tooltipLabelStyle = { color: 'var(--fg)', fontWeight: 600 }
const pieTooltipStyle = {
  borderRadius: 14,
  border: '1px solid var(--hairline)',
  background: 'var(--surface)',
  color: 'var(--fg)',
  fontSize: 12,
  padding: '8px 12px',
  boxShadow: '0 8px 30px rgba(0,0,0,.18)',
}
const pieNameStyle = { fontWeight: 600 }
const legendStyle = { fontSize: 12 }
const activeDot = { r: 4 }
// Theme-aware chart colors (soft green / soft red).
const chartPos = 'rgb(var(--pos))'
const chartNeg = 'rgb(var(--neg))'

function swatchStyle(color: string) {
  return { backgroundColor: color }
}

export default function Dashboard() {
  const { transactions, loading } = useTransactions()
  const { categories } = useCategories()

  const now = new Date()
  const [mode, setMode] = useState<RangeMode>('year')
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [customStart, setCustomStart] = useState(() => addDaysISO(iso(now), -90))
  const [customEnd, setCustomEnd] = useState(() => iso(now))
  const [pieKind, setPieKind] = useState<PieKind>('expense')
  const [trendCatId, setTrendCatId] = useState<string>('')
  const [detailKind, setDetailKind] = useState<PieKind>('expense')
  const [detailCatId, setDetailCatId] = useState<string>('')

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()])
    transactions.forEach((t) => set.add(Number(t.date.slice(0, 4))))
    return [...set].sort((a, b) => b - a)
  }, [transactions, now])

  const { startDate, endDate } = useMemo(() => {
    if (mode === 'month') {
      return {
        startDate: new Date(selYear, selMonth, 1),
        endDate: new Date(selYear, selMonth + 1, 0),
      }
    }
    if (mode === 'year') {
      return {
        startDate: new Date(selYear, 0, 1),
        endDate: new Date(selYear, 11, 31),
      }
    }
    if (mode === 'all') {
      const ys = years.length ? years : [now.getFullYear()]
      return {
        startDate: new Date(Math.min(...ys), 0, 1),
        endDate: new Date(Math.max(...ys), 11, 31),
      }
    }
    let a = new Date(`${customStart}T00:00:00`)
    let b = new Date(`${customEnd}T00:00:00`)
    if (a > b) [a, b] = [b, a]
    return { startDate: a, endDate: b }
  }, [mode, selYear, selMonth, customStart, customEnd, years, now])

  const startISO = iso(startDate)
  const endISO = iso(endDate)

  const granularity: Granularity = useMemo(() => {
    if (mode === 'month') return 'day'
    if (mode === 'year') return 'month'
    if (mode === 'all') return 'year'
    const spanDays = (endDate.getTime() - startDate.getTime()) / 86400000
    if (spanDays <= 62) return 'day'
    if (spanDays <= 731) return 'month'
    return 'year'
  }, [mode, startDate, endDate])

  const buckets = useMemo(() => {
    const out: Array<{ key: string; label: string }> = []
    const cur = new Date(startDate)
    const multiYear = startDate.getFullYear() !== endDate.getFullYear()
    if (granularity === 'day') {
      while (cur <= endDate) {
        out.push({ key: iso(cur), label: String(cur.getDate()) })
        cur.setDate(cur.getDate() + 1)
      }
    } else if (granularity === 'month') {
      cur.setDate(1)
      while (cur <= endDate) {
        const label = multiYear
          ? `${MONTHS_SHORT_ID[cur.getMonth()]} '${String(cur.getFullYear()).slice(2)}`
          : MONTHS_SHORT_ID[cur.getMonth()]
        out.push({
          key: `${cur.getFullYear()}-${String(cur.getMonth()).padStart(2, '0')}`,
          label,
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    } else {
      cur.setMonth(0, 1)
      while (cur <= endDate) {
        out.push({
          key: String(cur.getFullYear()),
          label: String(cur.getFullYear()),
        })
        cur.setFullYear(cur.getFullYear() + 1)
      }
    }
    return out
  }, [startDate, endDate, granularity])

  const filtered: Transaction[] = useMemo(
    () => transactions.filter((t) => t.date >= startISO && t.date <= endISO),
    [transactions, startISO, endISO],
  )

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const trendCategory = useMemo(() => {
    if (categories.length === 0) return null
    const found = categories.find((c) => c.id === trendCatId)
    if (found) return found
    return categories.find((c) => c.type === 'expense') ?? categories[0]
  }, [categories, trendCatId])

  const { barData, trendData, trendTotal } = useMemo(() => {
    const incMap = new Map<string, number>()
    const expMap = new Map<string, number>()
    const catMap = new Map<string, number>()
    let tTotal = 0
    filtered.forEach((t) => {
      const k = keyFor(t.date, granularity)
      if (t.type === 'income') incMap.set(k, (incMap.get(k) ?? 0) + t.amount)
      else expMap.set(k, (expMap.get(k) ?? 0) + t.amount)
      if (trendCategory && t.category_id === trendCategory.id) {
        catMap.set(k, (catMap.get(k) ?? 0) + t.amount)
        tTotal += t.amount
      }
    })
    return {
      barData: buckets.map((b) => ({
        label: b.label,
        Pemasukan: incMap.get(b.key) ?? 0,
        Pengeluaran: expMap.get(b.key) ?? 0,
      })),
      trendData: buckets.map((b) => ({
        label: b.label,
        value: catMap.get(b.key) ?? 0,
      })),
      trendTotal: tTotal,
    }
  }, [filtered, buckets, granularity, trendCategory])

  const pieData = useMemo(() => {
    const map = new Map<string, number>()
    filtered
      .filter((t) => t.type === pieKind)
      .forEach((t) => {
        const key = t.category_id ?? 'none'
        map.set(key, (map.get(key) ?? 0) + t.amount)
      })
    return [...map.entries()]
      .map(([catId, value]) => {
        const cat = categories.find((c) => c.id === catId)
        return {
          name: cat?.name ?? 'Tanpa kategori',
          value,
          color: cat?.color ?? '#7D7A75',
          catId,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [filtered, categories, pieKind])

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  function handlePieClick(d: any) {
    const id = d?.catId ?? d?.payload?.catId
    if (id && id !== 'none') setTrendCatId(id)
    setDetailKind(pieKind)
    setDetailCatId(id ?? '')
  }

  const detailByCat = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    filtered
      .filter((t) => t.type === detailKind)
      .forEach((t) => {
        const k = t.category_id ?? 'none'
        const cur = map.get(k) ?? { count: 0, total: 0 }
        cur.count += 1
        cur.total += t.amount
        map.set(k, cur)
      })
    return [...map.entries()]
      .map(([catId, v]) => {
        const cat = categories.find((c) => c.id === catId)
        return {
          catId,
          name: cat?.name ?? 'Tanpa kategori',
          color: cat?.color ?? '#7D7A75',
          count: v.count,
          total: v.total,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filtered, detailKind, categories])

  const detailTotalAll = detailByCat.reduce((s, d) => s + d.total, 0)

  const detailTx = useMemo(() => {
    if (!detailCatId) return []
    return filtered
      .filter(
        (t) => t.type === detailKind && (t.category_id ?? 'none') === detailCatId,
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [filtered, detailKind, detailCatId])

  const detailSelected = useMemo(() => {
    if (!detailCatId) return null
    return detailByCat.find((d) => d.catId === detailCatId) ?? null
  }, [detailByCat, detailCatId])

  const rangeLabel = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`
    if (mode === 'month') return `${MONTHS_ID[selMonth]} ${selYear}`
    if (mode === 'year') return `Tahun ${selYear}`
    if (mode === 'all') return 'Semua waktu'
    return `${fmt(startDate)} sampai ${fmt(endDate)}`
  }, [mode, selMonth, selYear, startDate, endDate])

  const modeButton = (m: RangeMode) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      mode === m
        ? 'bg-accent-strong text-white shadow-sm'
        : 'text-fg-muted hover:bg-accent-soft hover:text-accent'
    }`

  const selectClass =
    'rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm text-fg outline-none transition focus:border-accent-strong'

  if (loading) {
    return (
      <div className="grid h-64 place-items-center text-fg-muted">
        Memuat data…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          Menampilkan data:{' '}
          <span className="font-medium text-fg">{rangeLabel}</span>
        </p>
      </FadeIn>

      {/* Filter bar */}
      <FadeIn className="rounded-2xl border border-hairline bg-surface p-3 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-full border border-hairline bg-canvas p-1">
            <button className={modeButton('month')} onClick={() => setMode('month')}>
              Per Bulan
            </button>
            <button className={modeButton('year')} onClick={() => setMode('year')}>
              Per Tahun
            </button>
            <button className={modeButton('all')} onClick={() => setMode('all')}>
              Semua
            </button>
            <button className={modeButton('custom')} onClick={() => setMode('custom')}>
              Kustom
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'month' && (
              <>
                <select
                  className={selectClass}
                  value={selMonth}
                  onChange={(e) => setSelMonth(Number(e.target.value))}
                >
                  {MONTHS_ID.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={selYear}
                  onChange={(e) => setSelYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
            {mode === 'year' && (
              <select
                className={selectClass}
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            {mode === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-fg-muted">Dari</label>
                <input
                  type="date"
                  className={selectClass}
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <label className="text-sm text-fg-muted">s/d</label>
                <input
                  type="date"
                  className={selectClass}
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Summary */}
      <SummaryCards income={totalIncome} expense={totalExpense} balanceLabel="Selisih" />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <FadeIn className="rounded-3xl border border-hairline bg-surface p-4 shadow-card lg:col-span-3">
          <h2 className="mb-4 font-display text-base font-semibold">
            Pemasukan vs Pengeluaran
          </h2>
          {barData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => formatCompactIDR(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  cursor={cursorFill}
                  formatter={(v: number) => formatIDR(v)}
                />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="Pemasukan" fill={chartPos} radius={barRadius} maxBarSize={38} />
                <Bar dataKey="Pengeluaran" fill={chartNeg} radius={barRadius} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </FadeIn>

        <FadeIn className="rounded-3xl border border-hairline bg-surface p-4 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Rincian Kategori</h2>
            <div className="flex rounded-full border border-hairline bg-canvas p-0.5 text-xs">
              <button
                onClick={() => setPieKind('expense')}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  pieKind === 'expense' ? 'bg-accent-strong text-white' : 'text-fg-muted'
                }`}
              >
                Keluar
              </button>
              <button
                onClick={() => setPieKind('income')}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  pieKind === 'income' ? 'bg-accent-strong text-white' : 'text-fg-muted'
                }`}
              >
                Masuk
              </button>
            </div>
          </div>
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    onClick={handlePieClick}
                    className="cursor-pointer focus:outline-none"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieValueTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-2">
                {pieData.slice(0, 6).map((d) => (
                  <li key={d.name}>
                    <button
                      onClick={() => handlePieClick(d)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm transition hover:bg-accent-soft"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-fg">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={swatchStyle(d.color)}
                        />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="shrink-0 text-fg-muted">
                        {pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </FadeIn>
      </div>

      {/* Category trend line chart */}
      <FadeIn className="rounded-3xl border border-hairline bg-surface p-4 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <TrendingUp size={16} className="text-accent" />
              Tren Kategori
            </h2>
            {trendCategory && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    trendCategory.type === 'income'
                      ? 'bg-pos/10 text-pos'
                      : 'bg-neg/10 text-neg'
                  }`}
                >
                  {trendCategory.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
                <span>
                  Total {trendCategory.name} pada periode ini:{' '}
                  <span className="font-medium text-fg">{formatIDR(trendTotal)}</span>
                </span>
              </div>
            )}
          </div>
          <select
            className={selectClass}
            value={trendCategory?.id ?? ''}
            onChange={(e) => setTrendCatId(e.target.value)}
          >
            <optgroup label="Pengeluaran">
              {categories
                .filter((c) => c.type === 'expense')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Pemasukan">
              {categories
                .filter((c) => c.type === 'income')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        {trendData.length === 0 || !trendCategory ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => formatCompactIDR(v)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(v: number) => formatIDR(v)}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={trendCategory.name}
                stroke={trendCategory.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={activeDot}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </FadeIn>

      {/* Detail transaksi per kategori & periode */}
      <FadeIn className="rounded-3xl border border-hairline bg-surface p-4 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">
              Detail {detailKind === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </h2>
            <p className="text-xs text-fg-muted">{rangeLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-hairline bg-canvas p-0.5 text-xs">
              <button
                onClick={() => {
                  setDetailKind('expense')
                  setDetailCatId('')
                }}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  detailKind === 'expense' ? 'bg-accent-strong text-white' : 'text-fg-muted'
                }`}
              >
                Keluar
              </button>
              <button
                onClick={() => {
                  setDetailKind('income')
                  setDetailCatId('')
                }}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  detailKind === 'income' ? 'bg-accent-strong text-white' : 'text-fg-muted'
                }`}
              >
                Masuk
              </button>
            </div>
            <select
              className={selectClass}
              value={detailCatId}
              onChange={(e) => setDetailCatId(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {detailByCat.map((d) => (
                <option key={d.catId} value={d.catId}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {detailByCat.length === 0 ? (
          <EmptyChart />
        ) : detailCatId === '' ? (
          <div className="overflow-x-auto rounded-2xl border border-hairline">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-elevated text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Kategori</th>
                  <th className="px-4 py-2.5 text-right font-medium">Transaksi</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {detailByCat.map((d) => (
                  <tr
                    key={d.catId}
                    onClick={() => setDetailCatId(d.catId)}
                    className="cursor-pointer transition hover:bg-accent-soft"
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={swatchStyle(d.color)}
                        />
                        <span className="font-medium text-fg">{d.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
                      {d.count}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                        detailKind === 'income' ? 'text-pos' : 'text-neg'
                      }`}
                    >
                      {formatIDR(d.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
                      {detailTotalAll > 0
                        ? Math.round((d.total / detailTotalAll) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hairline bg-elevated font-semibold">
                  <td className="px-4 py-2.5 text-fg">Total</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right tabular-nums text-fg">
                    {formatIDR(detailTotalAll)}
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setDetailCatId('')}
                className="flex items-center gap-1 text-xs font-medium text-accent transition hover:underline"
              >
                <ChevronLeft size={14} />
                Semua kategori
              </button>
              {detailSelected && (
                <span className="text-xs text-fg-muted">
                  {detailSelected.name} · {detailSelected.count} transaksi · Total{' '}
                  <span
                    className={`font-semibold ${
                      detailKind === 'income' ? 'text-pos' : 'text-neg'
                    }`}
                  >
                    {formatIDR(detailSelected.total)}
                  </span>
                </span>
              )}
            </div>
            {detailTx.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
                {detailTx.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-fg">
                        {t.note?.trim() || 'Tanpa catatan'}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {formatDateID(t.date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        detailKind === 'income' ? 'text-pos' : 'text-neg'
                      }`}
                    >
                      {formatIDR(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </FadeIn>
    </div>
  )
}

function PieValueTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div style={pieTooltipStyle}>
      <div style={pieNameStyle}>{p.name}</div>
      <div>{formatIDR(p.value)}</div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="grid h-48 place-items-center text-sm text-fg-muted">
      Belum ada data untuk periode ini.
    </div>
  )
}
