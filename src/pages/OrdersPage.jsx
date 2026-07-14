import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import Page from '../components/ui/Page'
import Modal from '../components/ui/Modal'
import OrderRow from '../components/orders/OrderRow'
import { rupiah } from '../utils/format'

export default function OrdersPage() {
  const { orders, role } = useApp(); const [query, setQuery] = useState(''); const [selected, setSelected] = useState(null)
  const allOrders = role === 'student' ? orders : orders.concat({ id: 'PO-240714-03', item: 'Mie Ayam Bakso', pickup: '12:15', status: 'Siap Diambil', total: 15000 })
  const visible = useMemo(() => allOrders.filter((order) => `${order.id} ${order.item}`.toLowerCase().includes(query.toLowerCase())), [allOrders, query])
  return <Page title={role === 'student' ? 'Riwayat pre-order' : 'Daftar pre-order'} subtitle="Pantau status dan detail pesanan."><div className="panel table-panel"><div className="table-head"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari pesanan..." /></div><button className="filter" onClick={() => toast('Filter status tersedia pada data Supabase.')}>Filter status</button></div><div className="order-table"><div className="tr th"><span>ID Pesanan</span><span>Menu</span><span>Ambil</span><span>Status</span><span>Total</span></div>{visible.map((order) => <OrderRow key={order.id} order={order} table onClick={() => setSelected(order)} />)}</div></div>{selected && <Modal title="Detail pesanan" onClose={() => setSelected(null)}><span className="tag">{selected.status}</span><h2>{selected.item}</h2><p><b>{selected.id}</b><br />Pengambilan: {selected.pickup}<br />Jumlah: {selected.qty || 1} porsi</p><div className="quantity"><span>Total pesanan</span><b>{rupiah(selected.total)}</b></div><button className="btn secondary full" onClick={() => setSelected(null)}>Tutup detail</button></Modal>}</Page>
}
