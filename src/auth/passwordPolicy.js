/**
 * Shared signup / reset password rules.
 * Keep in sync with UI checklist copy in PasswordStrengthChecklist.
 */

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A–Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: "One lowercase letter (a–z)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "One special character (!@#$…)",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
]

/**
 * @param {string} password
 * @returns {Array<{ id: string, label: string, met: boolean }>}
 */
export function getPasswordRuleStatus(password) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }))
}

/**
 * @param {string} password
 */
export function isPasswordStrong(password) {
  return getPasswordRuleStatus(password).every((rule) => rule.met)
}

/**
 * @param {string} password
 * @returns {string} Empty when valid; otherwise a user-facing message.
 */
export function getPasswordValidationError(password) {
  const unmet = getPasswordRuleStatus(password).filter((rule) => !rule.met)
  if (!unmet.length) return ""
  if (unmet.length === 1) {
    return `Password must include ${unmet[0].label.toLowerCase()}.`
  }
  return "Password must meet all security requirements listed below."
}

/**
 * @param {string} password
 * @returns {'empty' | 'weak' | 'fair' | 'good' | 'strong'}
 */
export function getPasswordStrengthLevel(password) {
  if (!password) return "empty"
  const metCount = getPasswordRuleStatus(password).filter((r) => r.met).length
  if (metCount <= 2) return "weak"
  if (metCount <= 3) return "fair"
  if (metCount <= 4) return "good"
  return "strong"
}

const STRENGTH_LABELS = {
  empty: "",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
}

const STRENGTH_BAR = {
  empty: 0,
  weak: 1,
  fair: 2,
  good: 4,
  strong: 5,
}

export function getPasswordStrengthLabel(level) {
  return STRENGTH_LABELS[level] || ""
}

export function getPasswordStrengthBarSegments(level) {
  return STRENGTH_BAR[level] ?? 0
}
