/**
 * Lightweight placeholder for dashboard sections / cards while data loads.
 */
export default function SectionSkeleton({ rows = 3, className = "" }) {
  return (
    <div
      className={`animate-pulse space-y-3 rounded-2xl border border-[#e7eaf3] bg-white p-5 ${className}`}
      aria-hidden="true"
    >
      <div className="h-4 w-1/3 rounded-lg bg-[#eef1f7]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 w-full rounded-xl bg-[#f4f6fb]" />
      ))}
    </div>
  )
}
