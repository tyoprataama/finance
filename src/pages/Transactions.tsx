import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileType,
  Wallet,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { useOpeningBalances } from "../hooks/useOpeningBalances";
import Modal from "../components/Modal";
import TransactionForm from "../components/TransactionForm";
import ImportModal from "../components/ImportModal";
import { FadeIn, FadeStagger, FadeItem } from "../components/FadeUp";
import { buildReport } from "../utils/report";
import { balanceBefore, monthKey, resolveOpening } from "../utils/balance";
import {
  digitsOnly,
  groupThousands,
  formatIDR,
  formatDateID,
  MONTHS_ID,
  MONTHS_SHORT_ID,
  monthStartISO,
  monthEndISO,
  monthLabel,
  todayISO,
} from "../utils/format";
import type { Transaction, TxType } from "../types";

type TypeFilter = "all" | TxType;
type ExportScope = "week" | "month" | "year" | "custom";
type ExportFormat = "excel" | "pdf" | "word";

function dotStyle(color?: string) {
  return { backgroundColor: color ?? "#7D7A75" };
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const now = new Date();

const pieTooltipStyle = {
  borderRadius: 14,
  border: "1px solid var(--hairline)",
  background: "var(--surface)",
  color: "var(--fg)",
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 8px 30px rgba(0,0,0,.18)",
};
const pieNameStyle = { fontWeight: 600 };

function PieValueTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div style={pieTooltipStyle}>
      <div style={pieNameStyle}>{p.name}</div>
      <div>{formatIDR(p.value)}</div>
    </div>
  );
}

export default function TransactionsPage() {
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reload: reloadTransactions,
  } = useTransactions();
  const { categories, reload: reloadCategories } = useCategories();
  const { overrides, setOverride } = useOpeningBalances();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [pieKind, setPieKind] = useState<TxType>("expense");
  const [importOpen, setImportOpen] = useState(false);

  // Opening-balance editor
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingDigits, setOpeningDigits] = useState("");
  const [savingOpening, setSavingOpening] = useState(false);

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false);
  const [expScope, setExpScope] = useState<ExportScope>("month");
  const [expMonth, setExpMonth] = useState(now.getMonth());
  const [expYear, setExpYear] = useState(now.getFullYear());
  const [expWeek, setExpWeek] = useState(todayISO());
  const [expStart, setExpStart] = useState(
    monthStartISO(now.getFullYear(), now.getMonth()),
  );
  const [expEnd, setExpEnd] = useState(todayISO());
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Daftar catatan unik yang pernah dipakai (per tipe), diurutkan dari yang
  // paling sering — dipakai untuk autofill di form transaksi.
  const noteSuggestions = useMemo<Record<TxType, string[]>>(() => {
    const freq: Record<TxType, Map<string, number>> = {
      income: new Map(),
      expense: new Map(),
    };
    transactions.forEach((t) => {
      const n = t.note?.trim();
      if (!n) return;
      const m = freq[t.type];
      m.set(n, (m.get(n) ?? 0) + 1);
    });
    const byFreq = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
    return { income: byFreq(freq.income), expense: byFreq(freq.expense) };
  }, [transactions]);

  const start = monthStartISO(year, month);
  const end = monthEndISO(year, month);
  const label = monthLabel(year, month);

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    transactions.forEach((t) => set.add(Number(t.date.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  // Opening balance for the viewed month (editable override or auto carry-over).
  const { opening, isOverride } = useMemo(
    () => resolveOpening(transactions, overrides, year, month),
    [transactions, overrides, year, month],
  );

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end],
  );

  const monthIncome = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  // Sisa bulan lalu (saldo awal) digabung ke dalam pemasukan agar KPI konsisten:
  // Pemasukan - Pengeluaran = Saldo akhir.
  const incomeWithCarry = monthIncome + opening;
  const closing = incomeWithCarry - monthExpense;

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    monthTx
      .filter((t) => t.type === pieKind)
      .forEach((t) => {
        const key = t.category_id ?? "none";
        map.set(key, (map.get(key) ?? 0) + Number(t.amount));
      });
    return [...map.entries()]
      .map(([catId, value]) => {
        const cat = catMap.get(catId);
        return {
          name: cat?.name ?? "Tanpa Kategori",
          value,
          color: cat?.color ?? "#7D7A75",
          catId,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTx, catMap, pieKind]);
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  function handlePieClick(d: any) {
    const id = d?.catId ?? d?.payload?.catId;
    setTypeFilter(pieKind);
    setCategoryFilter(id && id !== "none" ? id : "none");
  }

  const filtered = useMemo(() => {
    return monthTx.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all") {
        if (categoryFilter === "none" && t.category_id) return false;
        if (categoryFilter !== "none" && t.category_id !== categoryFilter)
          return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const cat = t.category_id
          ? (catMap.get(t.category_id)?.name ?? "")
          : "";
        const hay = `${t.note ?? ""} ${cat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTx, typeFilter, categoryFilter, search, catMap]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  function goPrev() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function goNext() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const defaultDate = isCurrentMonth ? todayISO() : start;

  function closeModal() {
    setOpen(false);
    setEditing(null);
  }

  async function handleDeleteEditing() {
    if (!editing) return;
    if (confirm("Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan.")) {
      await deleteTransaction(editing.id);
      closeModal();
    }
  }

  // ---- Opening balance editor ----
  function startEditOpening() {
    setOpeningDigits(digitsOnly(String(Math.max(0, Math.round(opening)))));
    setOpeningOpen(true);
  }
  async function saveOpening() {
    setSavingOpening(true);
    try {
      await setOverride(monthKey(year, month), Number(openingDigits || "0"));
      setOpeningOpen(false);
    } finally {
      setSavingOpening(false);
    }
  }
  async function resetOpening() {
    setSavingOpening(true);
    try {
      await setOverride(monthKey(year, month), null);
      setOpeningOpen(false);
    } finally {
      setSavingOpening(false);
    }
  }

  // ---- Export ----
  function computeRange(): {
    start: string;
    end: string;
    label: string;
    slug: string;
  } {
    if (expScope === "year") {
      return {
        start: `${expYear}-01-01`,
        end: `${expYear}-12-31`,
        label: `Tahun ${expYear}`,
        slug: `Tahun-${expYear}`,
      };
    }
    if (expScope === "week") {
      const base = new Date(`${expWeek}T00:00:00`);
      const dow = (base.getDay() + 6) % 7; // Monday = 0
      const mon = new Date(base);
      mon.setDate(base.getDate() - dow);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const lbl = `${mon.getDate()} ${MONTHS_SHORT_ID[mon.getMonth()]} sampai ${sun.getDate()} ${MONTHS_SHORT_ID[sun.getMonth()]} ${sun.getFullYear()}`;
      return {
        start: isoOf(mon),
        end: isoOf(sun),
        label: lbl,
        slug: `Minggu-${isoOf(mon)}`,
      };
    }
    if (expScope === "custom") {
      let a = expStart;
      let b = expEnd;
      if (a > b) [a, b] = [b, a];
      return {
        start: a,
        end: b,
        label: `${formatDateID(a)} sampai ${formatDateID(b)}`,
        slug: `${a}_${b}`,
      };
    }
    return {
      start: monthStartISO(expYear, expMonth),
      end: monthEndISO(expYear, expMonth),
      label: monthLabel(expYear, expMonth),
      slug: monthLabel(expYear, expMonth).replace(/\s+/g, "-"),
    };
  }

  const exportPreview = useMemo(() => {
    const range = computeRange();
    const rows = transactions.filter(
      (t) => t.date >= range.start && t.date <= range.end,
    );
    return { range, count: rows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expScope, expMonth, expYear, expWeek, expStart, expEnd, transactions]);

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      const range = computeRange();
      const rows = transactions.filter(
        (t) => t.date >= range.start && t.date <= range.end,
      );
      const openingForRange = balanceBefore(
        transactions,
        overrides,
        range.start,
      );
      const report = buildReport({
        transactions: rows,
        categories,
        periodLabel: range.label,
        opening: openingForRange,
      });
      const base = `Keuanganku-${range.slug}`;
      if (format === "excel") {
        const { exportExcel } = await import("../utils/export/excel");
        await exportExcel(report, `${base}.xlsx`);
      } else if (format === "pdf") {
        const { exportPdf } = await import("../utils/export/pdf");
        await exportPdf(report, `${base}.pdf`);
      } else {
        const { exportWord } = await import("../utils/export/word");
        await exportWord(report, `${base}.docx`);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Transaksi
          </h1>
          <p className="text-sm text-fg-muted">
            Ditampilkan per bulan. Saldo awal bisa diedit manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm font-medium text-fg transition hover:bg-accent-soft hover:text-accent sm:px-4"
          >
            <Upload size={17} />
            <span className="hidden sm:inline">Impor</span>
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm font-medium text-fg transition hover:bg-accent-soft hover:text-accent sm:px-4"
          >
            <Download size={17} />
            <span className="hidden sm:inline">Ekspor</span>
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:px-4"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </FadeIn>

      {/* Month navigator */}
      <FadeIn className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label="Bulan sebelumnya"
            className="grid h-10 w-10 place-items-center rounded-full border border-hairline text-fg-muted transition hover:bg-accent-soft hover:text-accent"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[9.5rem] text-center font-display text-lg font-semibold">
            {label}
          </div>
          <button
            onClick={goNext}
            aria-label="Bulan berikutnya"
            className="grid h-10 w-10 place-items-center rounded-full border border-hairline text-fg-muted transition hover:bg-accent-soft hover:text-accent"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-full border border-hairline bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-accent-strong"
          >
            {MONTHS_ID.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-full border border-hairline bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-accent-strong"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {!isCurrentMonth && (
            <button
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
              className="rounded-full border border-hairline px-3 py-2 text-sm text-fg-muted transition hover:bg-accent-soft hover:text-accent"
            >
              Bulan ini
            </button>
          )}
        </div>
      </FadeIn>

      {/* Month summary strip */}
      <FadeStagger className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FadeItem className="rounded-2xl border border-hairline bg-elevated p-4 shadow-card">
          <p className="text-xs text-fg-muted">Pemasukan bulan ini</p>
          <p className="mt-1.5 font-display text-lg font-semibold text-pos">
            {formatIDR(incomeWithCarry)}
          </p>
          {opening !== 0 && (
            <p className="mt-0.5 text-[11px] text-fg-muted">
              termasuk sisa bln lalu {formatIDR(opening)}
            </p>
          )}
        </FadeItem>
        <FadeItem className="rounded-2xl border border-hairline bg-elevated p-4 shadow-card">
          <p className="text-xs text-fg-muted">Pengeluaran bulan ini</p>
          <p className="mt-1.5 font-display text-lg font-semibold text-neg">
            {formatIDR(monthExpense)}
          </p>
        </FadeItem>
        <FadeItem className="rounded-2xl border border-hairline bg-accent-strong p-4 text-white shadow-card">
          <p className="text-xs text-white/75">Saldo akhir</p>
          <p className="mt-1.5 font-display text-lg font-semibold">
            {formatIDR(closing)}
          </p>
        </FadeItem>
      </FadeStagger>

      {/* Month category pie */}
      {pieData.length > 0 && (
        <FadeIn className="rounded-3xl border border-hairline bg-surface p-4 shadow-card">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">
                Rincian {label}
              </h2>
              <p className="text-xs text-fg-muted">
                Klik salah satu bagian untuk memfilter transaksi.
              </p>
            </div>
            <div className="flex self-start rounded-full border border-hairline bg-canvas p-0.5 text-xs sm:self-auto">
              <button
                onClick={() => setPieKind("expense")}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  pieKind === "expense"
                    ? "bg-accent-strong text-white"
                    : "text-fg-muted"
                }`}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => setPieKind("income")}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  pieKind === "income"
                    ? "bg-accent-strong text-white"
                    : "text-fg-muted"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={88}
                  paddingAngle={2}
                  onClick={handlePieClick}
                  className="cursor-pointer focus:outline-none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.catId} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieValueTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-1.5">
              {pieData.slice(0, 7).map((d) => (
                <li key={d.catId}>
                  <button
                    onClick={() => handlePieClick(d)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-accent-soft"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-fg">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={dotStyle(d.color)}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-fg-muted">
                      {pieTotal > 0
                        ? Math.round((d.value / pieTotal) * 100)
                        : 0}
                      %
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[200px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari catatan / kategori"
            className="w-full rounded-full border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent-strong"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-full border border-hairline bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent-strong"
        >
          <option value="all">Semua tipe</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-hairline bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent-strong"
        >
          <option value="all">Semua kategori</option>
          <option value="none">Tanpa kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-hairline bg-surface text-fg-muted">
          Memuat…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Akses cepat: saldo akhir + tombol tambah (agar tak perlu scroll ke atas di HP) */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-card">
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">Saldo akhir {label}</p>
              <p className="font-display text-lg font-semibold text-accent">
                {formatIDR(closing)}
              </p>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Plus size={18} />
              Tambah Transaksi
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-14 text-center text-sm text-fg-muted">
              Tidak ada transaksi di {label}
              {search || typeFilter !== "all" || categoryFilter !== "all"
                ? " yang cocok dengan filter."
                : "."}
            </div>
          ) : (
            groups.map(([date, items]) => (
              <div key={date}>
                <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {formatDateID(date)}
                </p>
                <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
                  {items.map((t) => {
                    const cat = t.category_id
                      ? catMap.get(t.category_id)
                      : null;
                    const income = t.type === "income";
                    return (
                      <div
                        key={t.id}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <span
                          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                            income ? "bg-pos/12 text-pos" : "bg-neg/12 text-neg"
                          }`}
                        >
                          {income ? (
                            <ArrowUpRight size={16} />
                          ) : (
                            <ArrowDownRight size={16} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-fg">
                            {t.note?.trim() || (cat?.name ?? "Tanpa Kategori")}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={dotStyle(cat?.color)}
                            />
                            <span className="text-xs text-fg-muted">
                              {cat?.name ?? "Tanpa Kategori"}
                            </span>
                          </div>
                          <span
                            className={`mt-1 block text-sm font-semibold tabular-nums ${
                              income ? "text-pos" : "text-neg"
                            }`}
                          >
                            {income ? "+" : "\u2212"}
                            {formatIDR(Number(t.amount))}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditing(t);
                            setOpen(true);
                          }}
                          aria-label="Edit transaksi"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-accent-soft hover:text-accent"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Saldo awal (sisa bulan lalu) - di bawah, sesuai urutan tanggal (paling awal). */}
          <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-strong text-white">
              <Wallet size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg">
                  Saldo awal (sisa bulan lalu)
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isOverride
                      ? "bg-accent-strong text-white"
                      : "bg-surface text-fg-muted"
                  }`}
                >
                  {isOverride ? "Manual" : "Otomatis"}
                </span>
              </div>
              <p className="text-xs text-fg-muted">
                {isOverride
                  ? `Nilai diatur manual untuk ${label}.`
                  : `Dihitung otomatis dari akumulasi transaksi sebelum ${label}.`}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-accent">
              {formatIDR(opening)}
            </span>
            <button
              onClick={startEditOpening}
              aria-label="Edit saldo awal"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-surface hover:text-accent"
            >
              <Pencil size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Add / edit transaction modal */}
      <Modal
        open={open}
        title={editing ? "Edit Transaksi" : "Tambah Transaksi"}
        onClose={closeModal}
      >
        <TransactionForm
          categories={categories}
          initial={editing}
          defaultDate={defaultDate}
          noteSuggestions={noteSuggestions}
          onSubmit={(input) =>
            editing
              ? updateTransaction(editing.id, input)
              : addTransaction(input)
          }
          onDone={closeModal}
          onDelete={editing ? handleDeleteEditing : undefined}
        />
      </Modal>

      {/* Edit opening balance modal */}
      <Modal
        open={openingOpen}
        title={`Saldo awal (${label})`}
        onClose={() => setOpeningOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Atur “sisa bulan lalu” untuk {label}. Nilai ini menjadi saldo awal
            dan otomatis memengaruhi saldo akhir bulan.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Nominal saldo awal
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-muted">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={groupThousands(openingDigits)}
                onChange={(e) => setOpeningDigits(digitsOnly(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-hairline bg-canvas py-2.5 pl-9 pr-3 text-right font-medium tabular-nums text-fg outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/25"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveOpening}
              disabled={savingOpening}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-strong py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {savingOpening && <Loader2 size={16} className="animate-spin" />}
              Simpan
            </button>
            {isOverride && (
              <button
                onClick={resetOpening}
                disabled={savingOpening}
                className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2.5 text-sm font-medium text-fg-muted transition hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              >
                <RotateCcw size={15} />
                Otomatis
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Export modal */}
      <Modal
        open={exportOpen}
        title="Ekspor Laporan"
        onClose={() => setExportOpen(false)}
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-fg">Rentang waktu</p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["week", "Mingguan"],
                  ["month", "Bulanan"],
                  ["year", "Tahunan"],
                  ["custom", "Custom"],
                ] as Array<[ExportScope, string]>
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setExpScope(val)}
                  className={`rounded-full border px-2 py-2 text-xs font-medium transition ${
                    expScope === val
                      ? "border-accent-strong bg-accent-soft text-accent"
                      : "border-hairline text-fg-muted hover:text-fg"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {expScope === "week" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                Pilih tanggal dalam minggu tsb.
              </label>
              <input
                type="date"
                value={expWeek}
                onChange={(e) => setExpWeek(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
              />
            </div>
          )}

          {expScope === "month" && (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={expMonth}
                onChange={(e) => setExpMonth(Number(e.target.value))}
                className="rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
              >
                {MONTHS_ID.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={expYear}
                onChange={(e) => setExpYear(Number(e.target.value))}
                className="rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {expScope === "year" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                Tahun
              </label>
              <select
                value={expYear}
                onChange={(e) => setExpYear(Number(e.target.value))}
                className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {expScope === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Dari
                </label>
                <input
                  type="date"
                  value={expStart}
                  onChange={(e) => setExpStart(e.target.value)}
                  className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Sampai
                </label>
                <input
                  type="date"
                  value={expEnd}
                  onChange={(e) => setExpEnd(e.target.value)}
                  className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg outline-none focus:border-accent-strong"
                />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-hairline bg-elevated px-4 py-3 text-sm">
            <p className="font-medium text-fg">{exportPreview.range.label}</p>
            <p className="text-xs text-fg-muted">
              {exportPreview.count} transaksi akan diekspor.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-fg">Format</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleExport("excel")}
                disabled={exporting !== null}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface px-2 py-3 text-xs font-medium text-fg transition hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              >
                {exporting === "excel" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={18} />
                )}
                Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface px-2 py-3 text-xs font-medium text-fg transition hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              >
                {exporting === "pdf" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                PDF
              </button>
              <button
                onClick={() => handleExport("word")}
                disabled={exporting !== null}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface px-2 py-3 text-xs font-medium text-fg transition hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              >
                {exporting === "word" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileType size={18} />
                )}
                Word
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Import modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        categories={categories}
        onImported={() => {
          void reloadTransactions();
          void reloadCategories();
        }}
      />
    </div>
  );
}
