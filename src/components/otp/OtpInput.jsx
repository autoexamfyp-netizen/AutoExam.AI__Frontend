import { useCallback, useEffect, useRef } from "react"

const CELL =
  "flex h-11 w-9 min-w-0 items-center justify-center rounded-lg border border-[#e3e6ef] bg-white text-center text-base font-semibold text-[#1b1f36] shadow-sm outline-none transition-colors duration-150 focus-visible:border-[#6562f1] focus-visible:ring-2 focus-visible:ring-[#6562f1]/25 sm:h-12 sm:w-10 sm:text-lg"

/**
 * Segmented OTP input: auto-advance, backspace, paste. Controlled `value` is digits-only string.
 */
export default function OtpInput({
  length = 6,
  value = "",
  onChange,
  disabled = false,
  invalid = false,
  autoFocus = true,
  idPrefix = "otp",
  className = "",
}) {
  const refs = useRef([])
  const clean = value.replace(/\D/g, "").slice(0, length)

  const focusAt = useCallback((i) => {
    const el = refs.current[i]
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (!autoFocus || didAutoFocus.current) return
    didAutoFocus.current = true
    focusAt(0)
  }, [autoFocus, focusAt])

  const charAt = (i) => clean[i] ?? ""

  const handleChange = (index, inputVal) => {
    if (disabled) return
    const newChar = inputVal.replace(/\D/g, "").slice(-1)
    const before = clean.slice(0, index)
    const after = clean.slice(index + 1)
    const next = (before + newChar + after).slice(0, length)
    onChange(next)
    if (newChar && index < length - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index, e) => {
    if (disabled) return
    if (e.key === "Backspace") {
      e.preventDefault()
      if (clean[index]) {
        const before = clean.slice(0, index)
        const after = clean.slice(index + 1)
        onChange(before + after)
      } else if (index > 0) {
        const before = clean.slice(0, index - 1)
        const after = clean.slice(index)
        onChange(before + after)
        focusAt(index - 1)
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      focusAt(index - 1)
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (e) => {
    if (disabled) return
    const text = e.clipboardData.getData("text")
    if (!/\d/.test(text)) return
    e.preventDefault()
    const pasted = text.replace(/\D/g, "").slice(0, length)
    onChange(pasted)
    const focusIdx = Math.min(Math.max(pasted.length - 1, 0), length - 1)
    requestAnimationFrame(() => focusAt(focusIdx))
  }

  return (
    <div
      className={`flex flex-wrap justify-center gap-2 sm:gap-2.5 ${className}`}
      role="group"
      aria-label="One-time code"
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={`${idPrefix}-${i}`}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={charAt(i)}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`${CELL} ${invalid ? "border-red-300 ring-1 ring-red-200" : ""} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-invalid={invalid || undefined}
        />
      ))}
    </div>
  )
}
