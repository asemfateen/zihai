/**
 * IMPORTANT: DO NOT REVERT THIS FILE.
 *
 * All tools (HSKPage, StatsPage, PinyinChartPage) MUST have registered routes here.
 */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PageSuspense from "./components/PageSuspense";
import Layout from "./components/Layout";

const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const WordPage = lazy(() => import("./pages/WordPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ProfileEditPage = lazy(() => import("./pages/ProfileEditPage"));
const ProfileChangePasswordPage = lazy(
  () => import("./pages/ProfileChangePasswordPage"),
);
const RadicalsPage = lazy(() => import("./pages/RadicalsPage"));
const RadicalDetailPage = lazy(() => import("./pages/RadicalDetailPage"));
const HSKPage = lazy(() => import("./pages/HSKPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const PinyinChartPage = lazy(() => import("./pages/PinyinChartPage"));
const AnalyzerPage = lazy(() => import("./pages/AnalyzerPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ReadingPage = lazy(() => import("./pages/ReadingPage"));
const StoryPage = lazy(() => import("./pages/StoryPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const MatchGamePage = lazy(() => import("./pages/MatchGamePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const JourneyPage = lazy(() => import("./pages/JourneyPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const MockTestPage = lazy(() => import("./pages/MockTestPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <HomePage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/search",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <SearchPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/word/:query",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <WordPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/login",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <LoginPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/register",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <RegisterPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/forgot-password",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <ForgotPasswordPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/reset-password/:token",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <ResetPasswordPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/history",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <HistoryPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/profile",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfilePage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/flashcards",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <FlashcardsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/favorites",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <FavoritesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/profile/edit",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfileEditPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/profile/change-password",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfileChangePasswordPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/radicals",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <RadicalsPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/radicals/:radical",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <RadicalDetailPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/hsk",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <HSKPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/stats",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <StatsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/pinyin",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <PinyinChartPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/analyzer",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <AnalyzerPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
      {
        path: "/reading",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <ReadingPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/reading/:id",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <StoryPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/quiz",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <QuizPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/match-game",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <MatchGamePage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/settings",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/achievements",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <AchievementsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/journey",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <JourneyPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/journey/lesson/:id",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <LessonPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/leaderboard",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <LeaderboardPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/mock-test",
        element: (
          <PageSuspense>
            <ProtectedRoute>
              <ErrorBoundary>
                <MockTestPage />
              </ErrorBoundary>
            </ProtectedRoute>
          </PageSuspense>
        ),
      },
      {
        path: "/admin",
        element: (
          <PageSuspense>
            <AdminRoute>
              <ErrorBoundary>
                <AdminPage />
              </ErrorBoundary>
            </AdminRoute>
          </PageSuspense>
        ),
      },
      {
        path: "*",
        element: (
          <PageSuspense>
            <ErrorBoundary>
              <NotFoundPage />
            </ErrorBoundary>
          </PageSuspense>
        ),
      },
    ],
  },
]);

export default router;
