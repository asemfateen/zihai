import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

function AdminRoute({ children }) {
  const { user, initialized } = useAuth()
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center">
        <Spinner size={40} />
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (!user.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
