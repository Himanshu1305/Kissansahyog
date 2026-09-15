import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider } from './lib/i18n/LanguageProvider'
import { AuthProvider, useAuth } from './lib/auth/AuthProvider'
import { Spinner } from './components/ui'

// Route-level code splitting (perf budget: keep the initial bundle small).
const Homepage = lazy(() => import('./screens/Homepage'))
const Welcome = lazy(() => import('./screens/Welcome'))
const Privacy = lazy(() => import('./screens/Privacy'))
const Terms = lazy(() => import('./screens/Terms'))
const Signup = lazy(() => import('./screens/Signup'))
const Login = lazy(() => import('./screens/Login'))
const Home = lazy(() => import('./screens/Home'))
const Browse = lazy(() => import('./screens/Browse'))
const Post = lazy(() => import('./screens/Post'))
const ListingDetail = lazy(() => import('./screens/ListingDetail'))
const MyListings = lazy(() => import('./screens/MyListings'))
const Experts = lazy(() => import('./screens/Experts'))
const ExpertDetail = lazy(() => import('./screens/ExpertDetail'))
const Profile = lazy(() => import('./screens/Profile'))
const Admin = lazy(() => import('./screens/Admin'))
const Articles = lazy(() => import('./screens/Articles'))
const ArticleDetail = lazy(() => import('./screens/ArticleDetail'))
const Resources = lazy(() => import('./screens/Resources'))

// Gate for logged-in-only routes.
function Protected({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/" replace state={{ from: location }} />
  return children
}

// Send already-logged-in users away from the public entry screens.
function PublicOnly({ children }) {
  const { isLoggedIn } = useAuth()
  if (isLoggedIn) return <Navigate to="/home" replace />
  return children
}

// Admin-only gate: unauthenticated → login; authenticated but not admin →
// Access Denied is rendered by the Admin screen itself (so it's not a crash/404).
function AdminOnly({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Public landing page — viewable by everyone, including logged-in users
            (the logo links here; nav renders the logged-in state). */}
        <Route path="/" element={<Homepage />} />
        <Route path="/welcome" element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

        {/* Informational pages — reachable by everyone (no auth gate). */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/:slug" element={<ArticleDetail />} />
        <Route path="/resources" element={<Resources />} />

        <Route path="/home" element={<Protected><Home /></Protected>} />
        <Route path="/browse" element={<Protected><Browse /></Protected>} />
        <Route path="/post" element={<Protected><Post /></Protected>} />
        <Route path="/listing/:id" element={<Protected><ListingDetail /></Protected>} />
        <Route path="/my" element={<Protected><MyListings /></Protected>} />
        <Route path="/experts" element={<Protected><Experts /></Protected>} />
        <Route path="/experts/:id" element={<Protected><ExpertDetail /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
