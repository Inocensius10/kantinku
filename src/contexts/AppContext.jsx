import { createContext, useContext, useMemo, useState } from 'react'
import { demoUsers, initialOrders } from '../data/mockData'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [role, setRole] = useState('student')
  const [orders, setOrders] = useState(initialOrders)
  const value = useMemo(() => ({ role, setRole, user: demoUsers[role], orders, setOrders }), [role, orders])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
