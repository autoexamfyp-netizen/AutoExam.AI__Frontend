import Spinner from "./Spinner"

/**
 * Primary/secondary buttons with consistent loading affordance (spinner + disabled).
 */
export default function LoadingButton({
  type = "button",
  loading = false,
  disabled = false,
  children,
  className = "",
  spinnerClassName = "",
  ...rest
}) {
  const isDisabled = disabled || loading
  return (
    <button type={type} disabled={isDisabled} className={className} {...rest}>
      <span className={`inline-flex items-center justify-center gap-2 ${loading ? "min-h-[1.25rem]" : ""}`}>
        {loading ? <Spinner size="sm" className={spinnerClassName} decorative /> : null}
        {children}
      </span>
    </button>
  )
}
