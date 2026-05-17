import { digitsOnly } from "../../utils/examConfig"
import FieldError from "./FieldError"
import RequiredMark from "./RequiredMark"

export function inputStateClass({ error, valid, disabled }) {
  const base = "mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none [appearance:textfield]"
  if (disabled) return `${base} cursor-not-allowed border-[#e3e6ef] bg-[#f6f7fc] text-[#9aa3c2]`
  if (error) return `${base} border-red-400 focus:border-red-500`
  if (valid) return `${base} border-emerald-400 focus:border-emerald-500`
  return `${base} border-[#e3e6ef] focus:border-[#6562f1]`
}

export default function NumericField({
  label,
  required,
  value,
  placeholder,
  error,
  valid,
  disabled,
  inputRef,
  onChange,
  onBlur,
}) {
  return (
    <label className="text-sm">
      <span className="text-[#5d6580]">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={inputStateClass({ error: Boolean(error), valid, disabled })}
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        onBlur={onBlur}
      />
      <FieldError message={error} />
    </label>
  )
}
