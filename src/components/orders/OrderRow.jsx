import { ShoppingBag } from 'lucide-react'
import { rupiah } from '../../utils/format'

export default function OrderRow({ order, table = false, onClick }) {
  const statusClass = order.status === 'Siap Diambil' ? 'ready' : order.status === 'Diproses' ? 'process' : 'wait'
  return <button className={table ? 'tr row-button' : 'order-row row-button'} onClick={onClick}>
    <span>{table ? order.id : <><span className="order-icon"><ShoppingBag size={18} /></span><span><b>{order.item}</b><small>{order.id} · {order.qty || 1} porsi</small></span></>}</span>
    {table && <span><b>{order.item}</b><small>{order.qty || 1} porsi</small></span>}<span>{order.pickup}</span><span className={`status ${statusClass}`}>{order.status}</span><b>{rupiah(order.total)}</b>
  </button>
}
