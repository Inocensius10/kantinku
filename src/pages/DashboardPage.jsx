import { NavLink, useNavigate } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, ChevronRight, ClipboardList, Clock3, Coffee, MapPin, Package, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { menuItems, weeklyIncome } from '../data/mockData'
import { rupiah } from '../utils/format'
import Page from '../components/ui/Page'
import StatCard from '../components/ui/StatCard'
import MenuCard from '../components/menu/MenuCard'
import OrderRow from '../components/orders/OrderRow'

export default function DashboardPage() {
  const { role, user, orders } = useApp()
  if (role === 'student') return <StudentDashboard user={user} orders={orders} />
  if (role === 'employee') return <EmployeeDashboard user={user} />
  return <AdminDashboard superadmin={role === 'superadmin'} />
}

function StudentDashboard({ user, orders }) {
  const navigate = useNavigate()
  return <Page title={`Halo, ${user.name.split(' ')[0]}! 👋`} subtitle="Mau makan apa hari ini?"><div className="hero"><div><span className="hero-chip"><Clock3 size={15} /> Pesan sekarang, ambil tanpa antre</span><h2>Waktunya isi energi<br />untuk hari yang produktif.</h2><button className="btn light" onClick={() => navigate('/menu')}>Lihat menu <ChevronRight size={17} /></button></div><div className="hero-art">🍱</div></div><section className="section"><div className="section-title"><div><h2>Menu pilihan hari ini</h2><p className="muted">Fresh dibuat khusus untukmu</p></div><NavLink to="/menu">Lihat semua <ChevronRight size={16} /></NavLink></div><div className="menu-grid">{menuItems.slice(0, 3).map((item) => <MenuCard key={item.id} item={item} />)}</div></section><section className="split"><div className="panel"><div className="panel-head"><div><h3>Pesanan terakhir</h3><p>Pesanan pre-order Anda</p></div><NavLink to="/orders">Lihat semua</NavLink></div><OrderRow order={orders[0]} onClick={() => navigate('/orders')} /></div><div className="panel pickup"><span className="round-icon"><MapPin /></span><h3>Ambil pesananmu tepat waktu</h3><p>Datang ke loket sesuai jam pengambilan agar pesanan tetap hangat.</p></div></section></Page>
}

function EmployeeDashboard({ user }) {
  return <Page title={`Selamat pagi, ${user.name.split(' ')[0]}!`} subtitle="Semoga harimu menyenangkan dan produktif."><div className="attendance-hero"><div><span className="hero-chip"><CalendarDays size={15} /> Senin, 14 Juli 2026</span><h2>Belum melakukan absensi hari ini</h2><p>Pastikan Anda berada di area Kantin Utama sebelum melakukan absensi.</p><NavLink className="btn light" to="/attendance"><MapPin size={17} /> Absen sekarang</NavLink></div><div className="time">07<span>:42</span><small>WIB</small></div></div><div className="stat-grid three"><StatCard icon={<Package />} label="Stok bahan hari ini" value="8 item" info="Perlu diperbarui" /><StatCard icon={<Wallet />} label="Modal awal" value="Belum diisi" info="Setelah absensi" /><StatCard icon={<Coffee />} label="Loket bertugas" value="Kantin Utama" info="Zona A · Lantai 1" /></div></Page>
}

function AdminDashboard({ superadmin }) {
  return <Page title={superadmin ? 'Pusat kendali KantinKu' : 'Ringkasan Kantin Utama'} subtitle={superadmin ? 'Pantau seluruh operasional kantin sekolah.' : 'Performa operasional kantin Anda hari ini.'} action={<button className="btn primary" onClick={() => toast.success('Form pencatatan pendapatan dibuka.')}>+ Catat pendapatan</button>}><div className="stat-grid four"><StatCard icon={<Users />} label="Karyawan hadir" value="6 / 8" info="2 belum hadir" /><StatCard icon={<ClipboardList />} label="PO hari ini" value="48" info="+12% dari kemarin" /><StatCard icon={<Wallet />} label="Pendapatan hari ini" value="Rp1.248.000" info="+18% dari kemarin" /><StatCard icon={<Coffee />} label="Menu aktif" value="24" info="3 stok menipis" /></div><section className="dash-grid"><div className="panel chart-panel"><div className="panel-head"><div><h3>Pendapatan mingguan</h3><p>7–13 Juli 2026</p></div><b className="success">+16.8% ↗</b></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyIncome}><defs><linearGradient id="green" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity=".25" /><stop offset="100%" stopColor="#16a34a" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(value) => rupiah(value * 1000)} /><Area type="monotone" dataKey="value" stroke="#15803d" strokeWidth={3} fill="url(#green)" /></AreaChart></ResponsiveContainer></div></div><div className="panel"><div className="panel-head"><div><h3>Pre-order terbaru</h3><p>Pesanan masuk hari ini</p></div><NavLink to="/orders">Semua</NavLink></div>{['Alya Rahma', 'Rafi Akbar', 'Nisa Putri'].map((name, index) => <div className="mini-row" key={name}><span className="avatar">{name.split(' ').map((part) => part[0]).join('')}</span><span><b>{name}</b><small>{menuItems[index].name}</small></span><span className="status wait">Menunggu</span></div>)}</div></section></Page>
}
