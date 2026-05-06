import { forwardRef, useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import Spinner from "./Spinner"

const shellBase =
  "flex h-12 min-h-12 w-full items-center gap-2 rounded-xl border bg-white px-3 transition-[border-color,box-shadow] duration-150"
const shellNormal = "border-[#e3e6ef]"
const shellError = "border-red-300 ring-1 ring-red-200"
const shellDisabled = "cursor-not-allowed bg-[#f9fafc] opacity-70"

/**
 * Global password field with visibility toggle. Supports controlled and uncontrolled usage.
 * Controlled: pass `value` + `onChange`. Uncontrolled: pass `defaultValue` (optional `onChange`).
 */
const PasswordInput = forwardRef(function PasswordInput(
  {
    label,
    labelEnd,
    leftIcon,
    placeholder,
    name,
    id: idProp,
    value,
    defaultValue,
    onChange,
    error,
    invalid,
    disabled = false,
    loading = false,
    autoComplete = "current-password",
    className = "",
    inputClassName = "",
    "aria-describedby": ariaDescribedBy,
  },
  ref,
) {
  const autoId = useId()
  const inputId = idProp || `password-${autoId}`
  const errorId = `${inputId}-error`
  const isInvalid = Boolean(invalid || error)
  const [visible, setVisible] = useState(false)
  const isControlled = value !== undefined

  const shellClass = [shellBase, isInvalid ? shellError : shellNormal, disabled || loading ? shellDisabled : "", className]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="w-full">
      {label && labelEnd ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="block text-sm font-medium text-[#1d233d]">
            {label}
          </label>
          <span className="shrink-0">{labelEnd}</span>
        </div>
      ) : null}
      {label && !labelEnd ? (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[#1d233d]">
          {label}
        </label>
      ) : null}
      {!label && labelEnd ? <div className="mb-2 flex justify-end">{labelEnd}</div> : null}

      <div className={shellClass}>
        {leftIcon ? <span className="flex shrink-0 text-[#a2a8bd] [&_svg]:h-4 [&_svg]:w-4">{leftIcon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={isControlled ? value : undefined}
          defaultValue={isControlled ? undefined : defaultValue}
          onChange={onChange}
          disabled={disabled || loading}
          autoComplete={autoComplete}
          aria-busy={loading || undefined}
          aria-invalid={isInvalid || undefined}
          aria-describedby={[error ? errorId : null, ariaDescribedBy].filter(Boolean).join(" ") || undefined}
          className={`h-full min-h-0 w-full min-w-0 flex-1 border-none bg-transparent text-sm text-[#1b1f36] outline-none placeholder:text-[#a2a8bd] disabled:cursor-not-allowed ${inputClassName}`}
        />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          {loading ? (
            <Spinner size="sm" decorative />
          ) : (
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => setVisible((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-[#9aa1b8] transition hover:bg-[#f4f6fb] hover:text-[#5c6378] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6562f1] disabled:opacity-40"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          )}
        </span>
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default PasswordInput
