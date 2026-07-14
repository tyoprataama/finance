import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { demoSetOpening, getDemoOpenings, subscribeDemo } from '../lib/demo'

/**
 * Editable per-month opening balances ("sisa bulan lalu"), keyed by 'YYYY-MM'.
 * When a month has no override, the value is auto-computed as a running
 * carry-over (see utils/balance.ts).
 */
export function useOpeningBalances() {
  const { user, demo } = useAuth()
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (demo) {
      setOverrides(getDemoOpenings())
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_monthly_balances')
      .select('month, opening_balance')
    if (!error && data) {
      const map: Record<string, number> = {}
      for (const row of data as Array<{ month: string; opening_balance: number }>) {
        map[row.month] = Number(row.opening_balance)
      }
      setOverrides(map)
    }
    setLoading(false)
  }, [user, demo])

  useEffect(() => {
    void load()
    if (demo) {
      return subscribeDemo(() => setOverrides(getDemoOpenings()))
    }
  }, [load, demo])

  const setOverride = useCallback(
    async (month: string, amount: number | null): Promise<void> => {
      if (demo) {
        demoSetOpening(month, amount)
        return
      }
      if (!user) return
      if (amount == null) {
        await supabase.from('finance_monthly_balances').delete().eq('month', month)
      } else {
        await supabase.from('finance_monthly_balances').upsert(
          { user_id: user.id, month, opening_balance: amount },
          { onConflict: 'user_id,month' },
        )
      }
      await load()
    },
    [user, demo, load],
  )

  return { overrides, loading, setOverride }
}
