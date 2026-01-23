import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import Spaces from './pages/Spaces/Spaces'
import MyReservations from './pages/MyReservations/MyReservations'
import CreateReservation from './pages/CreateReservation/CreateReservation'
import ReservationsCalendar from './pages/ReservationsCalendar/ReservationsCalendar'
import AdminUsers from './pages/Admin/AdminUsers/AdminUsers'
import AdminSpaces from './pages/Admin/AdminSpaces/AdminSpaces'
import AdminReservations from './pages/Admin/AdminReservations/AdminReservations'
import './i18n'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/spaces" element={<ProtectedRoute><Spaces /></ProtectedRoute>} />
              <Route path="/my-reservations" element={<ProtectedRoute><MyReservations /></ProtectedRoute>} />
              <Route path="/create-reservation" element={<ProtectedRoute><CreateReservation /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><ReservationsCalendar /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/spaces" element={<ProtectedRoute adminOnly><AdminSpaces /></ProtectedRoute>} />
              <Route path="/admin/reservations" element={<ProtectedRoute adminOnly><AdminReservations /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
