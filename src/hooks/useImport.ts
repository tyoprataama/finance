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

      // 1) Buat kategori baru yang belum ada (satu kali per kategori unik).
      for (const row of rows) {
        const name = row.category.trim()
        if (!name) continue
        const key = catKey(name, row.type)
        if (map.has(key)) continue
        const color = PALETTE[colorIdx % PALETTE.length]
        colorIdx++
        const newId = await createCategory(name, row.type, color)
        if (newId) {
          map.set(key, newId)
          createdCategories++
        } else if (errors.length < 8) {
          errors.push(`Gagal membuat kategori "${name}".`)
        }
      }

      // 2) Petakan setiap baris ke category_id yang sesuai.
      const prepared = rows.map((row) => {
        const name = row.category.trim()
        const categoryId = name ? map.get(catKey(name, row.type)) ?? null : null
        return { row, categoryId }
      })

      // Mode demo: simpan di memori saja (tidak menyentuh database).
      if (demo) {
        for (const item of prepared) {
          demoAddTransaction({
            type: item.row.type,
            amount: item.row.amount,
            category_id: item.categoryId,
            note: item.row.note || undefined,
            date: item.row.date,
          })
          imported++
        }
        return { imported, skipped, createdCategories, errors }
      }

      if (!user) {
        return {
          imported: 0,
          skipped: rows.length,
          createdCategories,
          errors: ['Belum login.'],
        }
      }

      // 3) Insert MASSAL per batch 500 baris.
      const CHUNK = 500
      for (let i = 0; i < prepared.length; i += CHUNK) {
        const slice = prepared.slice(i, i + CHUNK)
        const records = slice.map((item) => ({
          user_id: user.id,
          type: item.row.type,
          amount: item.row.amount,
          category_id: item.categoryId,
          note: item.row.note || null,
          date: item.row.date,
        }))
        const { error } = await supabase
          .from('finance_transactions')
          .insert(records)
        if (error) {
          skipped += slice.length
          if (errors.length < 8) errors.push(error.message)
        } else {
          imported += slice.length
        }
      }

      return { imported, skipped, createdCategories, errors }
    } finally {
      setRunning(false)
    }
  }

  return { importRows, running }
}
