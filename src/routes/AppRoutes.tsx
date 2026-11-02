import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  Package,
  PackageSearch,
  Printer,
  Settings,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { AppLayout, type NavItem } from '@/layouts/AppLayout';
import { FullPageLoader, LoadingBlock } from '@/components/ui/Feedback';
import { PublicOnly, RequireAuth } from './guards';

import WelcomePage from '@/pages/auth/WelcomePage';
import LoginPage from '@/pages/auth/LoginPage';

const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const AccountStatusPage = lazy(() => import('@/pages/auth/AccountStatusPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const EmployeeHomePage = lazy(() => import('@/pages/employee/HomePage'));
const AttendancePage = lazy(() => import('@/pages/employee/AttendancePage'));
const SalesPage = lazy(() => import('@/pages/employee/SalesPage'));
const StockPage = lazy(() => import('@/pages/employee/StockPage'));
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const EmployeesPage = lazy(() => import('@/pages/admin/EmployeesPage'));
const SalesReportsPage = lazy(() => import('@/pages/admin/SalesReportsPage'));
const ShortageReportsPage = lazy(() => import('@/pages/admin/ShortageReportsPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const OutletsPage = lazy(() => import('@/pages/admin/OutletsPage'));
const ProductsPage = lazy(() => import('@/pages/admin/ProductsPage'));
const InventoryPage = lazy(() => import('@/pages/admin/InventoryPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

const NotFoundPage = lazy(() => import('@/pages/shared/NotFoundPage'));

const employeeNav: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/absensi', label: 'Absensi', icon: CalendarCheck },
  { to: '/app/grafik', label: 'Grafik', icon: BarChart3 },
  { to: '/app/stock', label: 'Stock', icon: PackageSearch },
];

const adminPrimary: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/karyawan', label: 'Karyawan', icon: Users },
  { to: '/admin/penjualan', label: 'Penjualan', icon: Wallet },
  { to: '/admin/stok', label: 'Stok', icon: ClipboardList },
  { to: '/admin/laporan', label: 'Cetak Laporan', icon: Printer },
];
const adminSecondary: NavItem[] = [
  { to: '/admin/loket', label: 'Loket', icon: Store },
  { to: '/admin/produk', label: 'Produk', icon: Package },
  { to: '/admin/bahan-baku', label: 'Bahan Baku', icon: Boxes },
  { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

const page = (el: ReactNode) => <Suspense fallback={<LoadingBlock label="Memuat halaman…" />}>{el}</Suspense>;

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<PublicOnly><WelcomePage /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/status" element={<RequireAuth requireActive={false}><AccountStatusPage /></RequireAuth>} />

        <Route
          path="/app"
          element={
            <RequireAuth role="employee">
              <AppLayout primary={employeeNav} profilePath="/app/profil" areaLabel="Karyawan" />
            </RequireAuth>
          }
        >
          <Route index element={page(<EmployeeHomePage />)} />
          <Route path="absensi" element={page(<AttendancePage />)} />
          <Route path="grafik" element={page(<SalesPage />)} />
          <Route path="stock" element={page(<StockPage />)} />
          <Route path="profil" element={page(<ProfilePage />)} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AppLayout primary={adminPrimary} secondary={adminSecondary} profilePath="/admin/profil" areaLabel="Admin" />
            </RequireAuth>
          }
        >
          <Route index element={page(<AdminDashboardPage />)} />
          <Route path="karyawan" element={page(<EmployeesPage />)} />
          <Route path="penjualan" element={page(<SalesReportsPage />)} />
          <Route path="stok" element={page(<ShortageReportsPage />)} />
          <Route path="laporan" element={page(<ReportsPage />)} />
          <Route path="loket" element={page(<OutletsPage />)} />
          <Route path="produk" element={page(<ProductsPage />)} />
          <Route path="bahan-baku" element={page(<InventoryPage />)} />
          <Route path="pengaturan" element={page(<SettingsPage />)} />
          <Route path="profil" element={page(<ProfilePage />)} />
        </Route>

        <Route path="/home" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
