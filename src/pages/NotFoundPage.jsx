import { NavLink } from 'react-router-dom'
import Page from '../components/ui/Page'
export default function NotFoundPage() { return <main className="not-found"><Page title="Halaman tidak ditemukan" subtitle="Halaman yang Anda tuju tidak tersedia."><NavLink className="btn primary" to="/login">Kembali ke login</NavLink></Page></main> }
