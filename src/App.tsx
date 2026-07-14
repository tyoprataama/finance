import { Navigate, Route, Routes } from 'react-router-dom'
import type { JSX } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TransactionsPage from './pages/Transactions'
import CategoriesPage from './pages/Categories'

function FullScreenLoader() {
  return (
    <div className="grid h-screen place-items-center bg-canvas text-fg-muted">
      Memuat…
    </div>
  )
}

function Protected({ children }: { children: JSX.Element }) {
  const { session, demo, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session && !demo) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session, demo, loading } = useAuth()
  if (loading) return <FullScreenLoader />

  const authed = Boolean(session) || demo

  return (
    <Routes>
      <Route
        path="/login"
        element={authed ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transaksi" element={<TransactionsPage />} />
        <Route path="kategori" element={<CategoriesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
