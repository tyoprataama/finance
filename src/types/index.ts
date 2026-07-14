export type TxType = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  name: string
  type: TxType
  color: string
  icon: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: TxType
  amount: number
  note: string | null
  /** ISO date, format YYYY-MM-DD */
  date: string
  created_at: string
}

export interface TransactionInput {
  type: TxType
  amount: number
  category_id: string | null
  note?: string
  date: string
}

export interface CategoryInput {
  name: string
  type: TxType
  color: string
  icon?: string | null
}
