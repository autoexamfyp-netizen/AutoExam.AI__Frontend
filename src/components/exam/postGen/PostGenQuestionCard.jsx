import { Check, ChevronDown, Loader2, Pencil, X } from "lucide-react"

function capitalize(s) {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mcqCorrectLetter(options, modelAnswer) {
  if (!Array.isArray(options) || !options.length || !modelAnswer) return null
  const idx = options.findIndex((o) => o.trim().toLowerCase() === String(modelAnswer).trim().toLowerCase())
  if (idx < 0) return null
  return String.fromCharCode(65 + idx)
}
export default function PostGenQuestionCard({
  index,
  question: q,
  editing,
  form,
  saving,
  onEdit,
  onDelete,
  onCancelEdit,
  onChangeForm,
  onSaveEdit,
}) {
  if (editing && form) {
    return (
      <article className="rounded-2xl border border-[#cfc8ff] bg-[#fafbff] p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5f4ce6]">Editing Q{index + 1}</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">
              <span className="text-[#5d6580]">Type</span>
              <div
                className="mt-1 flex h-9 items-center rounded-lg border border-[#e3e6ef] bg-[#f6f7fc] px-2 text-xs font-medium capitalize text-[#313a58]"
                title="Question type cannot be changed"
              >
                {form.question_type === "mcq"
                  ? "MCQ"
                  : form.question_type === "essay"
                    ? "Essay"
                    : "Short"}
              </div>
            </label>
            <label className="text-xs">
              <span className="text-[#5d6580]">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(e) => onChangeForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-xs"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-[#5d6580]">Marks</span>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => onChangeForm((f) => ({ ...f, marks: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-xs"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-[#5d6580]">Question</span>
            <textarea
              rows={3}
              value={form.prompt}
              onChange={(e) => onChangeForm((f) => ({ ...f, prompt: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
            />
          </label>
          {form.question_type === "mcq" ? (
            <div className="space-y-2 rounded-xl border border-[#eef1f7] bg-white p-3">
              <p className="text-[11px] font-semibold text-[#151d3a]">Four answer options</p>
              {["A", "B", "C", "D"].map((letter) => (
                <label key={letter} className="block text-xs">
                  <span className="text-[#5d6580]">Option {letter}</span>
                  <input
                    value={form[`option${letter}`]}
                    onChange={(e) =>
                      onChangeForm((f) => ({ ...f, [`option${letter}`]: e.target.value }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-sm"
                  />
                </label>
              ))}
              <label className="block text-xs">
                <span className="text-[#5d6580]">Correct answer</span>
                <select
                  value={form.correctLetter}
                  onChange={(e) => onChangeForm((f) => ({ ...f, correctLetter: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] bg-white px-2 text-sm"
                >
                  {["A", "B", "C", "D"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="block text-xs">
              <span className="text-[#5d6580]">Expected answer</span>
              <textarea
                rows={2}
                value={form.model_answer}
                onChange={(e) => onChangeForm((f) => ({ ...f, model_answer: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="h-9 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6562f1] px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </article>
    )
  }

  const typeLabel = (q.question_type || "short").toUpperCase()
  const diffLabel = capitalize(q.difficulty || "medium")
  const correctLetter =
    q.question_type === "mcq" ? mcqCorrectLetter(q.options, q.model_answer) : null

  return (
    <article className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#7f88a6]">
          <span className="text-[#151d3a]">Q{index + 1}</span>
          {" - "}
          <span className="rounded bg-[#f1efff] px-1.5 py-0.5 text-[#5f4ce6]">{typeLabel}</span>
          {" - "}
          {diffLabel}
          {" - "}
          {q.marks} pt{Number(q.marks) === 1 ? "" : "s"}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#313a58] hover:bg-[#fafbff]"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remove question from exam"
            className="inline-flex items-center justify-center rounded-lg border border-[#fbd8d8] bg-white px-2 py-1 text-[11px] font-semibold text-[#c94a4a] hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#1a2341]">{q.prompt}</p>
      {q.question_type === "mcq" && Array.isArray(q.options) ? (
        <ul className="mt-3 space-y-1.5 text-sm text-[#5d6580]">
          {q.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx)
            const isCorrect = correctLetter === letter
            return (
              <li
                key={`${letter}-${opt}`}
                className={`flex gap-2 rounded-lg px-3 py-2 ${
                  isCorrect ? "border border-emerald-100 bg-emerald-50" : "bg-[#fafbff]"
                }`}
              >
                {isCorrect ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className={isCorrect ? "text-[#1a2341]" : "text-[#5d6580]"}>
                  {letter}. {opt}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {q.question_type === "mcq" && correctLetter ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Correct: {correctLetter}</p>
      ) : null}
      {q.question_type !== "mcq" && q.model_answer ? (
        <details className="mt-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-3 py-2 text-xs font-semibold text-[#6562f1]">
            Expected answer
            <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 text-[#8a93ad]">{q.model_answer}</p>
        </details>
      ) : null}
    </article>
  )
}
