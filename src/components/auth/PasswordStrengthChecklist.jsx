import { Check, Circle } from "lucide-react"
import {
  getPasswordRuleStatus,
  getPasswordStrengthBarSegments,
  getPasswordStrengthLabel,
  getPasswordStrengthLevel,
} from "../../auth/passwordPolicy"

const BAR_COLORS = {
  weak: "bg-red-400",
  fair: "bg-amber-400",
  good: "bg-[#6562f1]",
  strong: "bg-emerald-500",
}

const LABEL_COLORS = {
  weak: "text-red-600",
  fair: "text-amber-700",
  good: "text-[#5f4ce6]",
  strong: "text-emerald-700",
}

/**
 * Live password requirement checklist + strength meter.
 */
export default function PasswordStrengthChecklist({
  password,
  confirmPassword = "",
  showMatch = true,
}) {
  const rules = getPasswordRuleStatus(password)
  const level = getPasswordStrengthLevel(password)
  const filled = getPasswordStrengthBarSegments(level)
  const showPanel = password.length > 0

  if (!showPanel && !(showMatch && confirmPassword.length > 0)) {
    return (
      <p className="text-xs leading-relaxed text-[#8a93ad]">
        Use at least 8 characters with uppercase, lowercase, a number, and a special character.
      </p>
    )
  }

  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword

  return (
    <div className="space-y-3">
      {showPanel ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Password strength
            </p>
            {level !== "empty" ? (
              <span className={`text-xs font-semibold ${LABEL_COLORS[level]}`}>
                {getPasswordStrengthLabel(level)}
              </span>
            ) : null}
          </div>

          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                  i < filled ? BAR_COLORS[level] : "bg-[#e7eaf3]"
                }`}
              />
            ))}
          </div>

          <ul className="space-y-1.5" aria-label="Password requirements">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
                    rule.met ? "bg-emerald-100 text-emerald-700" : "bg-[#eef1f7] text-[#9aa3c2]"
                  }`}
                  aria-hidden
                >
                  {rule.met ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Circle className="h-2 w-2 fill-current" />}
                </span>
                <span className={rule.met ? "font-medium text-[#1f9d67]" : "text-[#6d7390]"}>{rule.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {showMatch && confirmPassword.length > 0 ? (
        <p
          className={`flex items-center gap-1.5 text-xs font-medium ${
            passwordsMatch ? "text-emerald-700" : passwordsMismatch ? "text-red-600" : "text-[#6d7390]"
          }`}
          role="status"
        >
          {passwordsMatch ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Passwords match
            </>
          ) : passwordsMismatch ? (
            "Passwords do not match"
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
