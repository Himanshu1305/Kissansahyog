import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { isSafePath } from './lib/returnPath'
import { LanguageProvider } from './lib/i18n/LanguageProvider'
import { AuthProvider, useAuth } from './lib/auth/AuthProvider'
import { Spinner } from './components/ui'
import PwaPrompts from './components/PwaPrompts'
import BuyerComplianceGate from './components/BuyerComplianceGate'
import Footer from './components/layout/Footer'
import BottomTabBar from './components/BottomTabBar'
import { SiteJsonLd } from './components/layout/Seo'
import RouteSeo from './components/layout/RouteSeo'

// Route-level code splitting (perf budget: keep the initial bundle small).
const Homepage = lazy(() => import('./screens/Homepage'))
const Welcome = lazy(() => import('./screens/Welcome'))
const Privacy = lazy(() => import('./screens/Privacy'))
const Terms = lazy(() => import('./screens/Terms'))
const Signup = lazy(() => import('./screens/Signup'))
const Login = lazy(() => import('./screens/Login'))
const Home = lazy(() => import('./screens/Home'))
const Browse = lazy(() => import('./screens/Browse'))
const Bazaar = lazy(() => import('./screens/Bazaar'))
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
const Info = lazy(() => import('./screens/Info'))
const Sawaal = lazy(() => import('./screens/Sawaal'))
const SawaalDetail = lazy(() => import('./screens/SawaalDetail'))
const SawaalHub = lazy(() => import('./screens/SawaalHub'))
const Safalta = lazy(() => import('./screens/Safalta'))
const Yojana = lazy(() => import('./screens/Yojana'))
const SchemeDetail = lazy(() => import('./screens/SchemeDetail'))
const Videos = lazy(() => import('./screens/Videos'))
const DroneDidi = lazy(() => import('./screens/DroneDidi'))
const Mausam = lazy(() => import('./screens/Mausam'))
const Msp = lazy(() => import('./screens/Msp'))
const FasalSalah = lazy(() => import('./screens/FasalSalah'))
const AgroForestry = lazy(() => import('./screens/AgroForestry'))
const Credits = lazy(() => import('./screens/Credits'))
const KisanMela = lazy(() => import('./screens/KisanMela'))
const KisanMelaSubmit = lazy(() => import('./screens/KisanMelaSubmit'))
const Grievance = lazy(() => import('./screens/Grievance'))
const Contact = lazy(() => import('./screens/Contact'))
const Founder = lazy(() => import('./screens/Founder'))
const ColdStorage = lazy(() => import('./screens/ColdStorage'))
const ColdStorageDistrict = lazy(() => import('./screens/ColdStorageDistrict'))
const Greenhouse = lazy(() => import('./screens/Greenhouse'))
const GreenhouseSubsidy = lazy(() => import('./screens/GreenhouseSubsidy'))
const CarbonCredit = lazy(() => import('./screens/CarbonCredit'))
const CarbonBrief = lazy(() => import('./screens/CarbonBrief'))
const Jugaad = lazy(() => import('./screens/Jugaad'))
const JugaadJankari = lazy(() => import('./screens/JugaadJankari'))
const Join = lazy(() => import('./screens/Join'))
const Search = lazy(() => import('./screens/Search'))
const NotFound = lazy(() => import('./screens/NotFound'))

// Gate for logged-in-only routes.
function Protected({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/" replace state={{ from: location }} />
  return children
}

// Send already-logged-in users away from the public entry screens. Honour a
// ?next= return path (Batch1 item 3A) so a reveal→login round-trip still lands
// the user back on the listing they came from.
function PublicOnly({ children }) {
  const { isLoggedIn } = useAuth()
  const [params] = useSearchParams()
  if (isLoggedIn) {
    const next = params.get('next')
    return <Navigate to={isSafePath(next) ? next : '/home'} replace />
  }
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
        <Route path="/grievance" element={<Grievance />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/founder" element={<Founder />} />
        {/* Static /cold-storage before the dynamic district route. */}
        <Route path="/cold-storage" element={<ColdStorage />} />
        <Route path="/cold-storage/:district" element={<ColdStorageDistrict />} />
        {/* Static /greenhouse/subsidy before /greenhouse (distinct literals; order safe). */}
        <Route path="/greenhouse/subsidy" element={<GreenhouseSubsidy />} />
        <Route path="/greenhouse" element={<Greenhouse />} />
        {/* Static /carbon-credit/niti-sujhav before /carbon-credit (distinct literals, order safe). */}
        <Route path="/carbon-credit/niti-sujhav" element={<CarbonBrief />} />
        <Route path="/carbon-credit" element={<CarbonCredit />} />
        {/* Static /jugaad/jankari before /jugaad (distinct literals; order safe). */}
        <Route path="/jugaad/jankari" element={<JugaadJankari />} />
        <Route path="/jugaad" element={<Jugaad />} />
        <Route path="/join" element={<Join />} />
        {/* Public category landing pages (Batch 4 item D) — indexable, prerendered. */}
        <Route path="/bazaar" element={<Bazaar />} />
        <Route path="/bazaar/:slug" element={<Bazaar />} />
        <Route path="/search" element={<Search />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/:slug" element={<ArticleDetail />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/info" element={<Info />} />
        {/* Static /sawaal routes MUST precede the dynamic /sawaal/:slug route. */}
        <Route path="/sawaal" element={<Sawaal />} />
        <Route path="/sawaal/vishay/:category" element={<SawaalHub mode="category" />} />
        <Route path="/fasal/:crop/samasya" element={<SawaalHub mode="crop" />} />
        <Route path="/sawaal/:slug" element={<SawaalDetail />} />
        <Route path="/safalta" element={<Safalta />} />
        {/* Static /yojana routes MUST precede the dynamic /yojana/:slug route. */}
        <Route path="/yojana" element={<Yojana level={null} />} />
        <Route path="/yojana/central" element={<Yojana level="central" />} />
        <Route path="/yojana/mp" element={<Yojana level="state" />} />
        <Route path="/yojana/:slug" element={<SchemeDetail />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/drone-didi" element={<DroneDidi />} />
        <Route path="/mausam" element={<Mausam />} />
        <Route path="/fasal-salah" element={<FasalSalah />} />
        <Route path="/agro-forestry" element={<AgroForestry />} />
        {/* Static /msp before the dynamic /msp/:crop */}
        <Route path="/msp" element={<Msp />} />
        <Route path="/msp/:crop" element={<Msp />} />
        <Route path="/credits" element={<Credits />} />
        {/* Static /kisan-mela/submit before any dynamic route under /kisan-mela */}
        <Route path="/kisan-mela/submit" element={<KisanMelaSubmit />} />
        <Route path="/kisan-mela" element={<KisanMela />} />

        <Route path="/home" element={<Protected><Home /></Protected>} />
        {/* Public browsing (Batch1 item 3A): anyone can browse and open a listing.
            Login is needed only to reveal a phone number (handled in-component). */}
        <Route path="/browse" element={<Browse />} />
        <Route path="/post" element={<Protected><Post /></Protected>} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/my" element={<Protected><MyListings /></Protected>} />
        <Route path="/experts" element={<Protected><Experts /></Protected>} />
        <Route path="/experts/:id" element={<Protected><ExpertDetail /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />

        {/* Real 404 (noindex) — replaces the old soft-404 <Navigate to="/">. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Per-route SEO for mapped public pages (central; before routes so head is set early). */}
          <RouteSeo />
          <AppRoutes />
          {/* Shared site footer + sitewide JSON-LD on every route (central layout). */}
          <Footer />
          <SiteJsonLd />
          {/* Fixed mobile bottom tab bar on every route (below md); desktop uses the top NavBar. */}
          <BottomTabBar />
          <PwaPrompts />
          <BuyerComplianceGate />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
