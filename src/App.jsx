import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Requirements from './pages/Requirements'
import NewRequirement from './pages/NewRequirement'
import EditRequirement from './pages/EditRequirement'
import TalentDirectory from './pages/TalentDirectory'
import BlacklistTable from './pages/BlacklistTable'
import AddTalent from './pages/AddTalent'
import EditTalent from './pages/EditTalent'
import Reports from './pages/Reports'
import Tracker from './pages/Tracker'
import Employees from './pages/Employees'
import Equipment from './pages/Equipment'
import MobileLayout from './pages/mobile/MobileLayout'
import MobileDashboard from './pages/mobile/MobileDashboard'
import MobileTracker from './pages/mobile/MobileTracker'

function Protected({ children, permission }) {
  return <ProtectedRoute permission={permission}><Layout>{children}</Layout></ProtectedRoute>
}

function MobileProtected({ title, children }) {
  return <ProtectedRoute><MobileLayout title={title}>{children}</MobileLayout></ProtectedRoute>
}

// En pantallas de celular, las rutas principales llevan a la versión móvil (solo consulta)
function PhoneRedirect({ to, children }) {
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  return isPhone ? <Navigate to={to} replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"               element={<Login />} />
          <Route path="/"                    element={<PhoneRedirect to="/m"><Protected><Dashboard /></Protected></PhoneRedirect>} />
          <Route path="/m"                   element={<MobileProtected title="Dashboard"><MobileDashboard /></MobileProtected>} />
          <Route path="/m/tracker"           element={<MobileProtected title="Tracker"><MobileTracker /></MobileProtected>} />
          <Route path="/reports"             element={<Protected><Reports /></Protected>} />
          <Route path="/tracker"             element={<PhoneRedirect to="/m/tracker"><Protected><Tracker /></Protected></PhoneRedirect>} />
          <Route path="/clients"             element={<Protected><Clients /></Protected>} />
          <Route path="/requirements"        element={<Protected><Requirements /></Protected>} />
          <Route path="/requirements/new"    element={<Protected permission="requirements.create"><NewRequirement /></Protected>} />
          <Route path="/requirements/edit/:id" element={<Protected permission="requirements.edit"><EditRequirement /></Protected>} />
          <Route path="/talent"              element={<Protected><TalentDirectory /></Protected>} />
          <Route path="/talent/blacklist"    element={<Protected><BlacklistTable /></Protected>} />
          <Route path="/talent/new"          element={<Protected permission="talent.create"><AddTalent /></Protected>} />
          <Route path="/talent/edit/:code"   element={<Protected><EditTalent /></Protected>} />
          <Route path="/employees"           element={<Protected><Employees /></Protected>} />
          <Route path="/equipment"           element={<Protected><Equipment /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
