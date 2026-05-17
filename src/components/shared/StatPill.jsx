export default function StatPill({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[#e7eaf3]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3c2]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[#151d3a]">{value}</p>
    </div>
  )
}
