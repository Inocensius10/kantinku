import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { menuItems } from '../data/mockData'
import Page from '../components/ui/Page'
import MenuCard from '../components/menu/MenuCard'

export default function MenuPage() {
  const { role } = useApp(); const [query, setQuery] = useState(''); const [category, setCategory] = useState('Semua')
  const filtered = menuItems.filter((item) => (category === 'Semua' || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()))
  return <Page title={role === 'student' ? 'Jelajahi menu' : 'Kelola menu'} subtitle={role === 'student' ? 'Pilih favoritmu, pesan dulu, lalu ambil tanpa antre.' : 'Tambahkan, ubah, dan pantau menu untuk loket Anda.'}><div className="toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari menu favorit..." /></div><div className="chips">{['Semua', 'Makanan', 'Minuman', 'Sehat'].map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></div><div className="menu-grid all">{filtered.map((item) => <MenuCard key={item.id} item={item} editable={role !== 'student'} />)}</div>{!filtered.length && <div className="empty-state">Menu tidak ditemukan.</div>}</Page>
}
