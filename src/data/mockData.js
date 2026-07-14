export const menuItems = [
  { id: 1, name: 'Nasi Ayam Sambal Matah', category: 'Makanan', price: 18000, stock: 12, kiosk: 'Kantin Utama', emoji: '🍛', desc: 'Nasi pulen dengan ayam panggang dan sambal matah segar.' },
  { id: 2, name: 'Mie Ayam Bakso', category: 'Makanan', price: 15000, stock: 8, kiosk: 'Kantin Utama', emoji: '🍜', desc: 'Mie kenyal, ayam manis gurih, dan bakso sapi.' },
  { id: 3, name: 'Es Teh Lemon', category: 'Minuman', price: 6000, stock: 20, kiosk: 'Kantin Sehat', emoji: '🍋', desc: 'Teh melati dingin dengan perasan lemon asli.' },
  { id: 4, name: 'Salad Buah Segar', category: 'Sehat', price: 12000, stock: 6, kiosk: 'Kantin Sehat', emoji: '🥗', desc: 'Campuran buah musiman dengan saus yoghurt.' },
]

export const weeklyIncome = [
  { day: 'Sen', value: 420 }, { day: 'Sel', value: 680 }, { day: 'Rab', value: 520 },
  { day: 'Kam', value: 810 }, { day: 'Jum', value: 760 }, { day: 'Sab', value: 380 },
]

export const demoUsers = {
  student: { name: 'Alya Rahma', role: 'Student', initial: 'AR', subtitle: 'Kelas XII IPA 2' },
  employee: { name: 'Budi Santoso', role: 'Employee', initial: 'BS', subtitle: 'Kantin Utama' },
  admin: { name: 'Dewi Lestari', role: 'Admin', initial: 'DL', subtitle: 'Admin Kantin Utama' },
  superadmin: { name: 'Nadia Pratama', role: 'Superadmin', initial: 'NP', subtitle: 'Pengelola Sistem' },
}

export const initialOrders = [{ id: 'PO-240714-01', item: 'Nasi Ayam Sambal Matah', qty: 1, pickup: 'Hari ini, 11:45', status: 'Diproses', total: 18000 }]
