import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    document.body.classList.add('modal-open')
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('modal-open') }
  }, [onClose])

  const root = document.getElementById('modal-root')
  if (!root) return null
  return createPortal(<div className="modal-back" onMouseDown={onClose} role="presentation">
    <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-x" aria-label="Tutup popup" onClick={onClose}><X size={17} /></button>
      {children}
    </section>
  </div>, root)
}
