import { useState } from 'react'
import toast from 'react-hot-toast'
import { Check, MapPin } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import Page from '../components/ui/Page'

export default function AttendancePage() {
  const { role } = useApp(); const [done, setDone] = useState(false)
  const checkLocation = () => {
    if (!navigator.geolocation) return toast.error('Browser tidak mendukung lokasi.')
    toast.loading('Memverifikasi lokasi...', { id: 'geo' })
    navigator.geolocation.getCurrentPosition(() => { setDone(true); toast.success('Absensi berhasil dicatat!', { id: 'geo' }) }, () => toast.error('Izin lokasi diperlukan untuk absensi.', { id: 'geo' }), { enableHighAccuracy: true, timeout: 10000 })
  }
  return <Page title={role === 'employee' ? 'Absensi hari ini' : 'Data absensi'} subtitle={role === 'employee' ? 'Lakukan absensi saat berada dalam radius loket.' : 'Pantau kehadiran karyawan Kantin Utama.'}>{role === 'employee' ? <div className="attendance-card"><div className="location-visual"><MapPin size={36} /><div className="radius" /></div><div><span className="tag">VALIDASI LOKASI</span><h2>{done ? 'Absensi telah berhasil' : 'Anda berada di Kantin Utama?'}</h2><p>Lokasi Anda akan divalidasi dalam radius 100 meter dari titik loket yang ditentukan.</p>{done ? <button className="btn secondary"><Check size={17} /> Hadir pukul 07:43</button> : <button className="btn primary" onClick={checkLocation}><MapPin size={17} /> Verifikasi & absen masuk</button>}</div></div> : <AttendanceList />}</Page>
}

function AttendanceList() { return <div className="panel"><div className="panel-head"><div><h3>Kehadiran hari ini</h3><p>Senin, 14 Juli 2026</p></div><span className="status ready">6 hadir</span></div>{['Budi Santoso', 'Rina Kurnia', 'Andi Saputra', 'Lia Marlina'].map((name, index) => <div className="mini-row" key={name}><span className="avatar">{name.split(' ').map((part) => part[0]).join('')}</span><span><b>{name}</b><small>{index < 3 ? `Masuk pukul 07:3${index}` : 'Belum melakukan absensi'}</small></span><span className={`status ${index < 3 ? 'ready' : 'wait'}`}>{index < 3 ? 'Hadir' : 'Belum hadir'}</span></div>)}</div> }
