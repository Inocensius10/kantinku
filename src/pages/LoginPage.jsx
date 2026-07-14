import { NavLink, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Coffee } from 'lucide-react'
import { demoUsers } from '../data/mockData'
import { useApp } from '../contexts/AppContext'

export default function LoginPage() {
  const { setRole } = useApp(); const navigate = useNavigate()
  return <main className="auth"><section className="auth-brand"><div className="brand-mark"><Coffee /></div><p className="eyebrow">KANTINKU</p><h1>Kelola kantin,<br />lebih berdaya.</h1><p>Ekosistem kantin sekolah yang rapi, cepat, dan terhubung.</p><div className="auth-points"><span><Check /> Pre-order tanpa antre</span><span><Check /> Laporan terintegrasi</span><span><Check /> Absensi berbasis lokasi</span></div></section><section className="auth-form"><div><p className="eyebrow">SELAMAT DATANG</p><h2>Masuk ke akun Anda</h2><p className="muted">Pilih peran untuk melihat dashboard demo.</p></div><div className="role-grid">{Object.entries(demoUsers).map(([key, user]) => <button key={key} className="role-choice" onClick={() => { setRole(key); navigate('/dashboard') }}><span className="avatar">{user.initial}</span><span><b>{user.role}</b><small>{user.subtitle}</small></span><ChevronRight size={18} /></button>)}</div><p className="auth-foot">Belum punya akun siswa? <NavLink to="/register">Daftar sekarang</NavLink></p></section></main>
}
