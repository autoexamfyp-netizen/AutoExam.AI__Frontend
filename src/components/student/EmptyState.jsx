/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} [props.action]
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e0e4ef] bg-[#fafbff] px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-[#9aa3c2]">{icon}</div> : null}
      <p className="text-base font-semibold text-[#1a2341]">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm text-[#7f88a6]">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
