import { motion } from 'framer-motion'

export default function Page({ title, subtitle, action, children }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
    <div className="page-head"><div><p className="eyebrow">KANTINKU MANAGEMENT</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>
    {children}
  </motion.div>
}
