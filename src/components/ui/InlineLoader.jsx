import Spinner from "./Spinner"

export default function InlineLoader({ label = "Loading", size = "sm", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-[#6d7491] ${className}`}>
      <Spinner size={size} label={label} />
      {label ? <span aria-hidden="true">{label}</span> : null}
    </span>
  )
}
