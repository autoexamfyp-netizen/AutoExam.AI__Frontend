/**
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {import('react').ReactNode} [props.icon]
 * @param {string} [props.iconClassName] — wrapper span classes
 * @param {boolean} [props.compact] — denser layout for dashboard stat grids
 */
export default function StatCard({ label, value, icon, iconClassName = "bg-[#eeebff] text-[#6a55f5]", compact = false }) {
  return (
    <article
      className={`min-w-0 max-w-full border border-[#e7eaf3] bg-white shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition-shadow ${
        compact
          ? "rounded-xl p-3 hover:shadow-[0_6px_18px_rgba(27,39,94,0.06)]"
          : "rounded-2xl p-4 hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]"
      }`}
    >
      <div
        className={`flex min-w-0 items-center font-medium text-[#687191] ${
          compact ? "gap-2 text-xs" : "gap-3 text-sm"
        }`}
      >
        {icon ? (
          <span
            className={`grid shrink-0 place-items-center ${iconClassName} ${
              compact ? "h-7 w-7 rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-9 w-9 rounded-xl"
            }`}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 leading-snug break-words">{label}</span>
      </div>
      <p
        className={`min-w-0 break-words font-semibold tracking-[-0.3px] text-[#141c37] ${
          compact ? "mt-1.5 text-xl" : "mt-3 text-2xl sm:text-[28px]"
        }`}
      >
        {value}
      </p>
    </article>
  )
}
