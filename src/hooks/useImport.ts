import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { demoAddCategory, demoAddTransaction } from '../lib/demo'
import type { Category, TxType } from '../types'
import type { ParsedRow } from '../utils/import/parse'

const PALETTE = [
  '#5E9FE8', '#46A171', '#EAC26B', '#DE9255', '#BF8EDA',
  '#DF84A8', '#4FB9C9', '#E56458', '#7D7A75', '#2783DE',
]

export interface ImportResult {
  imported: number
  skipped: number
  createdCategories: number
  errors: string[]
}

function catKey(name: string, type: TxType): string {
  return `${type}:${name.trim().toLowerCase()}`
}

export function useImport() {
  const { user, demo } = useAuth()
  const [running, setRunning] = useState(false)

  async function createCategory(
    name: string,
    type: TxType,
    color: string,
  ): Promise<string | null> {
    if (demo) return demoAddCategory({ name, type, color })
    if (!user) return null
    const { data, error } = await supabase
      .from('finance_categories')
      .insert({ user_id: user.id, name, type, color, icon: null })
      .select('id')
      .single()
    if (error || !data) return null
    return (data as { id: string }).id
  }

  async function createTransaction(
    row: ParsedRow,
    categoryId: string | null,
  ): Promise<string | null> {
    if (demo) {
      demoAddTransaction({
        type: row.type,
        amount: row.amount,
        category_id: categoryId,
        note: row.note || undefined,
        date: row.date,
      })
      return null
    }
    if (!user) return 'Belum login'
    const { error } = await supabase.from('finance_transactions').insert({
      user_id: user.id,
      type: row.type,
      amount: row.amount,
      category_id: categoryId,
      note: row.note || null,
      date: row.date,
    })
    return error ? error.message : null
  }

  async function importRows(
    rows: ParsedRow[],
    categories: Category[],
  ): Promise<ImportResult> {
    setRunning(true)
    try {
      const map = new Map<string, string>()
      categories.forEach((c) => map.set(catKey(c.name, c.type), c.id))
      let colorIdx = categories.length
      let imported = 0
      let skipped = 0
      let createdCategories = 0
      const errors: string[] = []

      for (const row of rows) {
        let categoryId: string | null = null
        const name = row.category.trim()
        if (name) {
          const key = catKey(name, row.type)
          const existing = map.get(key)
          if (existing) {
            categoryId = existing
          } else {
            const color = PALETTE[colorIdx % PALETTE.length]
            colorIdx++
            const newId = await createCategory(name, row.type, color)
            if (newId) {
              map.set(key, newId)
              categoryId = newId
              createdCategories++
            } else if (errors.length < 8) {
              errors.push(`Gagal membuat kategori "${name}".`)
            }
          }
        }
        const err = await createTransaction(row, categoryId)
        if (err) {
          skipped++
          if (errors.length < 8) errors.push(err)
        } else {
          imported++
        }
      }

      return { imported, skipped, createdCategories, errors }
    } finally {
      setRunning(false)
    }
  }

  return { importRows, running }
}
