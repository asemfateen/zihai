/**
 * IMPORTANT: DO NOT REVERT THIS FILE.
 *
 * All tools (HSKPage, StatsPage, PinyinChartPage) MUST have registered routes here.
 */
import { lazy, Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import Spinner from './components/Spinner'
import OfflineBanner from './components/OfflineBanner'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
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
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'))
const ProfileChangePasswordPage = lazy(() => import('./pages/ProfileChangePasswordPage'))
const RadicalsPage = lazy(() => import('./pages/RadicalsPage'))
const RadicalDetailPage = lazy(() => import('./pages/RadicalDetailPage'))
const HSKPage = lazy(() => import('./pages/HSKPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const PinyinChartPage = lazy(() => import('./pages/PinyinChartPage'))
const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ReadingPage = lazy(() => import('./pages/ReadingPage'))
const StoryPage = lazy(() => import('./pages/StoryPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const MatchGamePage = lazy(() => import('./pages/MatchGamePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))

function PageSuspense({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center"><Spinner size={40} /></div>}>
      {children}
    </Suspense>
  )
}

function Layout() {
  return (
    <div className="min-h-screen bg-transparent relative z-10 relative overflow-hidden z-0">
      {/* Global Dynamic background blobs */}
      <div className="fixed top-0 left-1/4 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-orange-500/5 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none"></div>
      <CommandPalette />
      <ScrollRestoration />
      <Outlet />
      <OfflineBanner />
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <PageSuspense><ErrorBoundary><HomePage /></ErrorBoundary></PageSuspense> },
      { path: '/search', element: <PageSuspense><ErrorBoundary><SearchPage /></ErrorBoundary></PageSuspense> },
      { path: '/word/:query', element: <PageSuspense><ErrorBoundary><WordPage /></ErrorBoundary></PageSuspense> },
      { path: '/login', element: <PageSuspense><ErrorBoundary><LoginPage /></ErrorBoundary></PageSuspense> },
      { path: '/register', element: <PageSuspense><ErrorBoundary><RegisterPage /></ErrorBoundary></PageSuspense> },
      { path: '/forgot-password', element: <PageSuspense><ErrorBoundary><ForgotPasswordPage /></ErrorBoundary></PageSuspense> },
      { path: '/reset-password/:token', element: <PageSuspense><ErrorBoundary><ResetPasswordPage /></ErrorBoundary></PageSuspense> },
      { path: '/history', element: <PageSuspense><ProtectedRoute><ErrorBoundary><HistoryPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/profile', element: <PageSuspense><ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/flashcards', element: <PageSuspense><ProtectedRoute><ErrorBoundary><FlashcardsPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/favorites', element: <PageSuspense><ProtectedRoute><ErrorBoundary><FavoritesPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/profile/edit', element: <PageSuspense><ProtectedRoute><ErrorBoundary><ProfileEditPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/profile/change-password', element: <PageSuspense><ProtectedRoute><ErrorBoundary><ProfileChangePasswordPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/radicals', element: <PageSuspense><ErrorBoundary><RadicalsPage /></ErrorBoundary></PageSuspense> },
      { path: '/radicals/:radical', element: <PageSuspense><ErrorBoundary><RadicalDetailPage /></ErrorBoundary></PageSuspense> },
      { path: '/hsk', element: <PageSuspense><ProtectedRoute><ErrorBoundary><HSKPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/stats', element: <PageSuspense><ProtectedRoute><ErrorBoundary><StatsPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/pinyin', element: <PageSuspense><ErrorBoundary><PinyinChartPage /></ErrorBoundary></PageSuspense> },
      { path: '/analyzer', element: <PageSuspense><ErrorBoundary><AnalyzerPage /></ErrorBoundary></PageSuspense> },
      { path: '/reading', element: <PageSuspense><ProtectedRoute><ErrorBoundary><ReadingPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/reading/:id', element: <PageSuspense><ProtectedRoute><ErrorBoundary><StoryPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/quiz', element: <PageSuspense><ProtectedRoute><ErrorBoundary><QuizPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/match-game', element: <PageSuspense><ProtectedRoute><ErrorBoundary><MatchGamePage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/settings', element: <PageSuspense><ProtectedRoute><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '/achievements', element: <PageSuspense><ProtectedRoute><ErrorBoundary><AchievementsPage /></ErrorBoundary></ProtectedRoute></PageSuspense> },
      { path: '*', element: <PageSuspense><ErrorBoundary><NotFoundPage /></ErrorBoundary></PageSuspense> },
    ],
  },
])

export default router
