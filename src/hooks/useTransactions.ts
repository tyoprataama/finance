import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionInput } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  demoAddTransaction,
  demoDeleteTransaction,
  demoUpdateTransaction,
  getDemoTransactions,
  subscribeDemo,
} from '../lib/demo'

export function useTransactions() {
  const { user, demo } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (demo) {
      setTransactions(getDemoTransactions())
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    const pageSize = 1000
    let from = 0
    const all: Transaction[] = []
    let fetchError: string | null = null
    for (;;) {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) {
        fetchError = error.message
        break
      }
      const batch = (data ?? []) as Transaction[]
      all.push(...batch)
      if (batch.length < pageSize) break
      from += pageSize
    }
    if (fetchError) setError(fetchError)
    else setTransactions(all)
    setLoading(false)
  }, [user, demo])

  useEffect(() => {
    void load()
    if (demo) {
      return subscribeDemo(() => setTransactions(getDemoTransactions()))
    }
  }, [load, demo])

  async function addTransaction(input: TransactionInput): Promise<string | null> {
    if (demo) {
      demoAddTransaction(input)
      return null
    }
    if (!user) return 'Belum login'
    const { error } = await supabase.from('finance_transactions').insert({
      user_id: user.id,
      type: input.type,
      amount: input.amount,
      category_id: input.category_id,
      note: input.note ?? null,
      date: input.date,
    })
    if (error) return error.message
    await load()
    return null
  }

  async function updateTransaction(
    id: string,
    patch: Partial<TransactionInput>,
  ): Promise<string | null> {
    if (demo) {
      demoUpdateTransaction(id, patch)
      return null
    }
    const { error } = await supabase.from('finance_transactions').update(patch).eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  async function deleteTransaction(id: string): Promise<string | null> {
    if (demo) {
      demoDeleteTransaction(id)
      return null
    }
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  return {
    transactions,
    loading,
    error,
    reload: load,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
