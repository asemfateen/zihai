import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <p className="text-2xl text-text-primary mb-2">Page not found</p>
        <p className="text-text-secondary mb-8 text-center">The page you are looking for doesn't exist or has been moved.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-primary-hover transition-all hover:scale-105 font-medium"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
