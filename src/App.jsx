import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider } from './lib/i18n/LanguageProvider'
import { AuthProvider, useAuth } from './lib/auth/AuthProvider'
import { Spinner } from './components/ui'

// Route-level code splitting (perf budget: keep the initial bundle small).
const Welcome = lazy(() => import('./screens/Welcome'))
const Signup = lazy(() => import('./screens/Signup'))
const Login = lazy(() => import('./screens/Login'))
const Home = lazy(() => import('./screens/Home'))
const Placeholder = lazy(() => import('./screens/Placeholder'))

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

function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

        <Route path="/home" element={<Protected><Home /></Protected>} />
        <Route path="/browse" element={<Protected><Placeholder title="खोजें · Browse" /></Protected>} />
        <Route path="/post" element={<Protected><Placeholder title="नई लिस्टिंग · Post" /></Protected>} />
        <Route path="/my" element={<Protected><Placeholder title="मेरी लिस्टिंग · My Listings" /></Protected>} />

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
