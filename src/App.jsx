import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MenuPage from './pages/MenuPage'
import OrdersPage from './pages/OrdersPage'
import AttendancePage from './pages/AttendancePage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/users" element={<UsersPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter>
}
