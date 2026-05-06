/**
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {import('react').ReactNode} [props.icon]
 * @param {string} [props.iconClassName] — wrapper span classes
 */
export default function StatCard({ label, value, icon, iconClassName = "bg-[#eeebff] text-[#6a55f5]" }) {
  return (
    <article className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]">
      <div className="flex min-w-0 items-center gap-3 text-sm font-medium text-[#687191]">
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClassName}`}>{icon}</span>
        ) : null}
        <span className="min-w-0 leading-snug break-words">{label}</span>
      </div>
      <p className="mt-3 min-w-0 break-words text-2xl font-semibold tracking-[-0.4px] text-[#141c37] sm:text-[28px]">{value}</p>
    </article>
  )
}
