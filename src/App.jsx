import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import AddTalent from './pages/AddTalent'
import EditTalent from './pages/EditTalent'
import Reports from './pages/Reports'
import Tracker from './pages/Tracker'

function Protected({ children, permission }) {
  return <ProtectedRoute permission={permission}><Layout>{children}</Layout></ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"               element={<Login />} />
          <Route path="/"                    element={<Protected><Dashboard /></Protected>} />
          <Route path="/reports"             element={<Protected><Reports /></Protected>} />
          <Route path="/tracker"             element={<Protected><Tracker /></Protected>} />
          <Route path="/clients"             element={<Protected><Clients /></Protected>} />
          <Route path="/requirements"        element={<Protected><Requirements /></Protected>} />
          <Route path="/requirements/new"    element={<Protected permission="requirements.create"><NewRequirement /></Protected>} />
          <Route path="/requirements/edit/:id" element={<Protected permission="requirements.edit"><EditRequirement /></Protected>} />
          <Route path="/talent"              element={<Protected><TalentDirectory /></Protected>} />
          <Route path="/talent/new"          element={<Protected permission="talent.create"><AddTalent /></Protected>} />
          <Route path="/talent/edit/:code"   element={<Protected><EditTalent /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
