import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, CategoryInput } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  demoAddCategory,
  demoDeleteCategory,
  demoUpdateCategory,
  getDemoCategories,
  subscribeDemo,
} from '../lib/demo'

export function useCategories() {
  const { user, demo } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (demo) {
      setCategories(getDemoCategories())
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_categories')
      .select('*')
      .order('type', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setCategories((data ?? []) as Category[])
    setLoading(false)
  }, [user, demo])

  useEffect(() => {
    void load()
    if (demo) {
      return subscribeDemo(() => setCategories(getDemoCategories()))
    }
  }, [load, demo])

  async function addCategory(input: CategoryInput): Promise<string | null> {
    if (demo) {
      demoAddCategory(input)
      return null
    }
    if (!user) return 'Belum login'
    const { error } = await supabase.from('finance_categories').insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon ?? null,
    })
    if (error) return error.message
    await load()
    return null
  }

  async function updateCategory(
    id: string,
    patch: Partial<CategoryInput>,
  ): Promise<string | null> {
    if (demo) {
      demoUpdateCategory(id, patch)
      return null
    }
    const { error } = await supabase.from('finance_categories').update(patch).eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  async function deleteCategory(id: string): Promise<string | null> {
    if (demo) {
      demoDeleteCategory(id)
      return null
    }
    const { error } = await supabase.from('finance_categories').delete().eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  return {
    categories,
    loading,
    error,
    reload: load,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
