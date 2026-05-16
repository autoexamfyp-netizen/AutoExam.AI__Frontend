import { useMemo, useState } from "react"
import { ChevronDown, Loader2, Sparkles } from "lucide-react"

/**
 * Collapsible question generator — separate from the note editor.
 */
export default function GeneratePanel({
  config,
  onConfigChange,
  onGenerate,
  generating,
  canGenerate,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
}) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded)
  const expanded = expandedProp ?? expandedInternal
  const setExpanded = onExpandedChange ?? setExpandedInternal

  const totalMarks = useMemo(
    () =>
      (config.mcq || 0) * (config.marksMcq || 0) +
      (config.short || 0) * (config.marksShort || 0) +
      (config.essay || 0) * (config.marksEssay || 0),
    [config],
  )

  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#fafbff] sm:px-5"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <Sparkles className="h-4 w-4 text-[#6562f1]" />
          Generate questions from this note
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#7f88a6] transition ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-[#eef1f7] px-4 pb-4 pt-3 sm:px-5">
          <p className="text-xs text-[#7f88a6]">
            Configure how many questions you need and click Generate.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Num label="MCQs" value={config.mcq} min={0} max={20} onChange={(v) => onConfigChange({ mcq: v })} />
            <Num label="Short" value={config.short} min={0} max={20} onChange={(v) => onConfigChange({ short: v })} />
            <Num label="Essay" value={config.essay} min={0} max={10} onChange={(v) => onConfigChange({ essay: v })} />
            <label className="block text-xs font-semibold text-[#9aa3c2]">
              Difficulty
              <select
                value={config.difficulty}
                onChange={(e) => onConfigChange({ difficulty: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] bg-white px-2 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Num
              label="Marks per MCQ"
              value={config.marksMcq}
              min={1}
              max={20}
              onChange={(v) => onConfigChange({ marksMcq: v })}
            />
            <Num
              label="Marks per short"
              value={config.marksShort}
              min={1}
              max={30}
              onChange={(v) => onConfigChange({ marksShort: v })}
            />
            <Num
              label="Marks per essay"
              value={config.marksEssay}
              min={1}
              max={50}
              onChange={(v) => onConfigChange({ marksEssay: v })}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[#313a58]">
              Total marks: <span className="font-semibold text-[#5f4ce6]">{totalMarks}</span>
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || generating}
              className="inline-flex h-11 min-w-[12rem] items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-5 text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-50 sm:shrink-0"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate question bank
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Num({ label, value, min, max, onChange }) {
  return (
    <label className="block text-xs font-semibold text-[#9aa3c2]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] bg-white px-2 text-sm"
      />
    </label>
  )
}
