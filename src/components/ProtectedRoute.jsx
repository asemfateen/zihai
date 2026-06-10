import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

function ProtectedRoute({ children }) {
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

  return children
}

export default ProtectedRoute
