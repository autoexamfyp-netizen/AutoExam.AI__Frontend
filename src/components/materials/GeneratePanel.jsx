import { Loader2, Sparkles } from "lucide-react"

/**
 * Configure counts / difficulty / marks and generate question bank items from pasted text.
 *
 * @param {object} props
 * @param {object} props.config
 * @param {(patch: object) => void} props.onConfigChange
 * @param {() => void} props.onGenerate
 * @param {boolean} props.generating
 * @param {boolean} props.canGenerate
 */
export default function GeneratePanel({ config, onConfigChange, onGenerate, generating, canGenerate }) {
  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-gradient-to-br from-[#f8f7ff] to-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
        <Sparkles className="h-4 w-4 text-[#6562f1]" />
        Generate question bank
      </div>
      <p className="mt-1 text-xs text-[#7f88a6]">
        Uses your pasted text only. Optional: set <code className="rounded bg-white px-1">VITE_AI_QUESTIONS_URL</code> for a
        real AI backend; otherwise a classroom-safe mock builds questions from your sentences.
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
        <Num label="Marks (MCQ)" value={config.marksMcq} min={1} max={20} onChange={(v) => onConfigChange({ marksMcq: v })} />
        <Num label="Marks (short)" value={config.marksShort} min={1} max={30} onChange={(v) => onConfigChange({ marksShort: v })} />
        <Num label="Marks (essay)" value={config.marksEssay} min={1} max={50} onChange={(v) => onConfigChange({ marksEssay: v })} />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate Question Bank
          </>
        )}
      </button>
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
