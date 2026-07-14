export default function StatCard({ icon, label, value, info }) {
  return <div className="stat"><span className="stat-icon">{icon}</span><p>{label}</p><h2>{value}</h2><small>{info}</small></div>
}
