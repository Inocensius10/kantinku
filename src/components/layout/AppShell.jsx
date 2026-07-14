import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bell, ChevronRight, ClipboardList, Coffee, FileText, LayoutDashboard, LogOut, MapPin, Menu, Package, ShieldCheck, ShoppingBag, Users, X, Zap } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

const NavItem = ({ to, icon, children, onClick }) => <NavLink to={to} className="nav-item" onClick={onClick}>{icon}<span>{children}</span></NavLink>

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role, user } = useApp()
  const location = useLocation()
  const title = location.pathname.split('/').pop().replace(/^./, (letter) => letter.toUpperCase())
  const closeMenu = () => setMobileOpen(false)
  return <div className="app">
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Coffee /></div><span>Kantin<span>Ku</span></span><button className="close" onClick={closeMenu}><X /></button></div>
      <nav><NavItem to="/dashboard" icon={<LayoutDashboard />} onClick={closeMenu}>Dashboard</NavItem>
        {role === 'student' ? <><p className="nav-label">PESANAN</p><NavItem to="/menu" icon={<ShoppingBag />} onClick={closeMenu}>Jelajahi Menu</NavItem><NavItem to="/orders" icon={<ClipboardList />} onClick={closeMenu}>Riwayat PO</NavItem></> : <><p className="nav-label">OPERASIONAL</p>
          {role === 'employee' ? <><NavItem to="/attendance" icon={<MapPin />} onClick={closeMenu}>Absensi</NavItem><NavItem to="/reports" icon={<Package />} onClick={closeMenu}>Stok & Modal</NavItem></> : <><NavItem to="/menu" icon={<Coffee />} onClick={closeMenu}>Kelola Menu</NavItem><NavItem to="/orders" icon={<ClipboardList />} onClick={closeMenu}>Pre Order</NavItem><NavItem to="/attendance" icon={<Users />} onClick={closeMenu}>Absensi</NavItem><NavItem to="/reports" icon={<FileText />} onClick={closeMenu}>Laporan</NavItem>{role === 'superadmin' && <NavItem to="/users" icon={<ShieldCheck />} onClick={closeMenu}>Pengguna & Loket</NavItem>}</>}</>}
      </nav>
      <div className="sidebar-bottom"><button className="support" onClick={() => toast('Pusat bantuan akan segera tersedia.')}><Zap size={18} /><span><b>Butuh bantuan?</b><small>Pusat Bantuan KMS</small></span></button><NavLink className="logout" to="/login"><LogOut size={18} /> Keluar</NavLink></div>
    </aside>
    <main className="workspace"><header><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu /></button><div className="crumb"><span>Beranda</span><ChevronRight size={15} /><b>{title}</b></div><div className="header-actions"><button className="icon-btn" aria-label="Notifikasi" onClick={() => toast.success('Tidak ada notifikasi baru.')}><Bell size={19} /><i /></button><div className="profile"><span className="avatar">{user.initial}</span><span><b>{user.name}</b><small>{user.role}</small></span></div></div></header><div className="content"><Outlet /></div></main>
  </div>
}
