import { lazy, Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import Spinner from './components/Spinner'
import OfflineBanner from './components/OfflineBanner'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { createBrowserRouter } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/HomePage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const WordPage = lazy(() => import('./pages/WordPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function PageSuspense({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Spinner size={40} /></div>}>
      {children}
    </Suspense>
  )
}

function Layout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <OfflineBanner />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <PageSuspense><ErrorBoundary><HomePage /></ErrorBoundary></PageSuspense> },
      { path: '/search', element: <PageSuspense><ErrorBoundary><SearchPage /></ErrorBoundary></PageSuspense> },
      { path: '/word/:id', element: <PageSuspense><ErrorBoundary><WordPage /></ErrorBoundary></PageSuspense> },
      { path: '/login', element: <PageSuspense><ErrorBoundary><LoginPage /></ErrorBoundary></PageSuspense> },
      { path: '/register', element: <PageSuspense><ErrorBoundary><RegisterPage /></ErrorBoundary></PageSuspense> },
      { path: '/forgot-password', element: <PageSuspense><ErrorBoundary><ForgotPasswordPage /></ErrorBoundary></PageSuspense> },
      { path: '/reset-password/:token', element: <PageSuspense><ErrorBoundary><ResetPasswordPage /></ErrorBoundary></PageSuspense> },
      { path: '/history', element: <PageSuspense><ProtectedRoute><ErrorBoundary><HistoryPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/profile', element: <PageSuspense><ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/dashboard', element: <PageSuspense><ProtectedRoute><ErrorBoundary><DashboardPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/flashcards', element: <PageSuspense><ProtectedRoute><ErrorBoundary><FlashcardsPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/favorites', element: <PageSuspense><ProtectedRoute><ErrorBoundary><FavoritesPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '*', element: <PageSuspense><ErrorBoundary><NotFoundPage /></ErrorBoundary></PageSuspense> },
    ],
  },
])

export default router
