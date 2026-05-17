import { useMemo } from "react"
import { computePctTotal, validateWeightage } from "../../utils/weightageValidation"

const numInputClass =
  "w-12 rounded-lg border border-[#e3e6ef] bg-white px-2 py-1 text-right text-sm text-[#151d3a] placeholder:text-[#bcc2d8] focus:border-[#6562f1] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const numInputErrorClass = "border-red-400 focus:border-red-500"

function digitsOnly(raw) {
  return String(raw ?? "").replace(/\D/g, "")
}

function InlineError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-[10px] font-medium leading-snug text-red-600">{message}</p>
}

/**
 * Source weightage block embedded in the AI configuration panel (multi-note only).
 */
export default function ConfigWeightageSection({
  materials,
  percentages,
  onPercentagesChange,
  submitAttempted = false,
  touchedPctIds,
  onTouchPct,
}) {
  const validation = useMemo(
    () =>
      validateWeightage({
        materials,
        percentages,
        submitAttempted,
        touchedPctIds,
      }),
    [materials, percentages, submitAttempted, touchedPctIds],
  )

  const pctTotal = useMemo(() => computePctTotal(materials, percentages), [materials, percentages])
  const pctRowErrors = validation.pct?.rowErrors ?? {}

  return (
    <div className="mt-3 border-t border-[#eef1f7] pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
        Source weightage
      </p>

      <div className="mt-3 space-y-2">
        {materials.map((m) => {
          const rowError = pctRowErrors[m.id]
          return (
            <div key={m.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#313a58]">
                  {m.title || "Untitled"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={percentages[m.id] ?? ""}
                    onChange={(e) =>
                      onPercentagesChange({
                        ...percentages,
                        [m.id]: digitsOnly(e.target.value),
                      })
                    }
                    onBlur={() => onTouchPct(m.id)}
                    className={`${numInputClass}${rowError ? ` ${numInputErrorClass}` : ""}`}
                  />
                  <span className="text-[#7f88a6]">%</span>
                </div>
              </div>
              <InlineError message={rowError} />
            </div>
          )
        })}
        <div className="border-t border-[#eef1f7] pt-2">
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="text-[#313a58]">Total</span>
            <span className={pctTotal === 100 ? "text-emerald-600" : "text-amber-600"}>
              {pctTotal} %
            </span>
          </div>
          {validation.pct?.totalMessage ? (
            <p
              className={`mt-1 text-[11px] font-medium ${
                validation.pct.totalTone === "success" ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {validation.pct.totalMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
