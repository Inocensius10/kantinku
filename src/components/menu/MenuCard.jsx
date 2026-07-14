import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { rupiah } from '../../utils/format'
import Modal from '../ui/Modal'

export default function MenuCard({ item, editable = false }) {
  const [open, setOpen] = useState(false)
  return <article className="menu-card"><div className="food-art">{item.emoji}<span>{item.stock} porsi</span></div><div className="menu-body"><span className="tag">{item.category}</span><h3>{item.name}</h3><p>{item.kiosk}</p><div><b>{rupiah(item.price)}</b><button className="circle-add" aria-label={editable ? `Ubah ${item.name}` : `Pesan ${item.name}`} onClick={() => setOpen(true)}><Plus size={18} /></button></div></div>{open && (editable ? <EditMenuModal item={item} onClose={() => setOpen(false)} /> : <OrderModal item={item} onClose={() => setOpen(false)} />)}</article>
}

function OrderModal({ item, onClose }) {
  const { setOrders, user } = useApp()
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [pickup, setPickup] = useState('Hari ini, 12:30')
  const placeOrder = () => {
    const order = { id: `PO-${Date.now().toString().slice(-6)}`, item: item.name, qty, pickup, status: 'Menunggu', total: item.price * qty }
    setOrders((current) => [order, ...current])
    toast.success('Pre-order berhasil dibuat!')
    onClose()
    const message = encodeURIComponent(`Halo ${item.kiosk}, saya ${user.name} ingin memesan ${item.name} (${qty} porsi), ambil ${pickup}.${notes ? ` Catatan: ${notes}` : ''}`)
    window.open(`https://wa.me/628000000000?text=${message}`, '_blank', 'noopener,noreferrer')
  }
  return <Modal title={`Pesan ${item.name}`} onClose={onClose}><div className="modal-food">{item.emoji}</div><span className="tag">Pre-order</span><h2>{item.name}</h2><p>{item.desc}</p><div className="quantity"><span>Jumlah pesanan</span><div><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><b>{qty}</b><button onClick={() => setQty(qty + 1)}>+</button></div></div><label>Catatan pesanan<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: tanpa sambal" /></label><label>Waktu pengambilan<select value={pickup} onChange={(event) => setPickup(event.target.value)}><option>Hari ini, 12:30</option><option>Hari ini, 12:45</option><option>Hari ini, 13:00</option></select></label><button className="btn primary full" onClick={placeOrder}>Pesan {rupiah(item.price * qty)}</button></Modal>
}

function EditMenuModal({ item, onClose }) {
  const [name, setName] = useState(item.name)
  const save = () => { toast.success(`Menu “${name}” diperbarui.`); onClose() }
  return <Modal title={`Ubah ${item.name}`} onClose={onClose}><span className="tag">KELOLA MENU</span><h2>Ubah menu</h2><label>Nama menu<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Harga<input defaultValue={item.price} inputMode="numeric" /></label><label>Stok<input defaultValue={item.stock} inputMode="numeric" /></label><button className="btn primary full" onClick={save}>Simpan perubahan</button></Modal>
}
