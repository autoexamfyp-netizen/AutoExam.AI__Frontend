/**
 * Brand-aligned spinner. Use via size prop or className for ring color.
 * Pass `decorative` when adjacent text already conveys loading state.
 */
export default function Spinner({ size = "md", className = "", label, decorative = false }) {
  const sizeClass =
    size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-10 w-10 border-[3px]" : "h-6 w-6 border-2"

  const announce = Boolean(label) && !decorative

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role={announce ? "status" : undefined}
      aria-label={label || undefined}
      aria-hidden={decorative ? true : !label ? true : undefined}
    >
      <span className={`${sizeClass} animate-spin rounded-full border-[#e3e6ef] border-t-[#6562f1]`} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
