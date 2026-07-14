import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatIDR } from '../utils/format'
import { FadeStagger, FadeItem } from './FadeUp'

type Tone = 'pos' | 'neg' | 'accent'

interface Props {
  income: number
  expense: number
  balanceLabel?: string
}

function toneText(t: Tone): string {
  if (t === 'pos') return 'text-pos'
  if (t === 'neg') return 'text-neg'
  return 'text-accent'
}

function badgeClass(t: Tone): string {
  const base = 'grid h-9 w-9 place-items-center rounded-full '
  if (t === 'pos') return base + 'bg-pos/15 text-pos'
  if (t === 'neg') return base + 'bg-neg/15 text-neg'
  return base + 'bg-accent-soft text-accent'
}

export default function SummaryCards({
  income,
  expense,
  balanceLabel = 'Saldo',
}: Props) {
  const balance = income - expense
  const cards = [
    { label: 'Pemasukan', value: income, icon: TrendingUp, tone: 'pos' as Tone },
    {
      label: 'Pengeluaran',
      value: expense,
      icon: TrendingDown,
      tone: 'neg' as Tone,
    },
    {
      label: balanceLabel,
      value: balance,
      icon: Wallet,
      tone: (balance >= 0 ? 'accent' : 'neg') as Tone,
    },
  ]

  return (
    <FadeStagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <FadeItem
            key={c.label}
            className="rounded-2xl border border-hairline bg-elevated p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-muted">{c.label}</span>
              <span className={badgeClass(c.tone)}>
                <Icon size={16} />
              </span>
            </div>
            <p
              className={`mt-3 font-display text-2xl font-semibold ${toneText(
                c.tone,
              )}`}
            >
              {formatIDR(c.value)}
            </p>
          </FadeItem>
        )
      })}
    </FadeStagger>
  )
}
