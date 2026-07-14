import { NavLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Coffee } from 'lucide-react'

const schema = z.object({ name: z.string().min(3, 'Nama minimal 3 karakter'), email: z.string().email('Email tidak valid'), nis: z.string().min(4, 'NIS wajib diisi'), phone: z.string().min(9, 'Nomor HP tidak valid'), password: z.string().min(8, 'Minimal 8 karakter') })
export default function RegisterPage() {
  const navigate = useNavigate(); const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const fields = [['name', 'Nama lengkap', 'text'], ['email', 'Email sekolah', 'email'], ['nis', 'NIS', 'text'], ['phone', 'Nomor WhatsApp', 'tel'], ['password', 'Kata sandi', 'password']]
  return <main className="register"><button className="back" onClick={() => navigate('/login')}>← Kembali</button><form onSubmit={handleSubmit(() => { toast.success('Akun berhasil dibuat. Silakan masuk.'); navigate('/login') })}><div className="brand-line"><div className="brand-mark"><Coffee /></div><b>KantinKu</b></div><h1>Buat akun siswa</h1><p className="muted">Mulai pesan lebih praktis dari kantin sekolah.</p><div className="field-grid">{fields.map(([name, label, type]) => <label key={name}>{label}<input type={type} placeholder={label} {...register(name)} />{errors[name] && <small className="error">{errors[name].message}</small>}</label>)}</div><label>Kelas<select defaultValue="XII IPA 2"><option>XII IPA 2</option><option>XII IPA 1</option><option>XI IPS 1</option></select></label><button className="btn primary full">Buat akun</button><p className="auth-foot">Sudah punya akun? <NavLink to="/login">Masuk</NavLink></p></form></main>
}
