import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"

/**
 * Single question bank row.
 *
 * @param {object} props
 * @param {object} props.question
 * @param {number} [props.index]
 * @param {(q: object) => void} [props.onEdit]
 * @param {(q: object) => void} [props.onDelete]
 * @param {boolean} [props.selected]
 * @param {(q: object) => void} [props.onToggleSelect]
 */
export default function QuestionCard({ question, index, onEdit, onDelete, selected = false, onToggleSelect }) {
  const [open, setOpen] = useState(false)
  const opts = question.options

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        selected ? "border-[#6562f1] ring-2 ring-[#6562f1]/15" : "border-[#e7eaf3]"
      }`}
    >
      <div className="flex flex-wrap items-start gap-2 text-xs">
        {onToggleSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(question)}
            aria-label={`Select question ${index || ""}`.trim()}
            className="mt-1 h-4 w-4 shrink-0 rounded border-[#cfd5e6]"
          />
        ) : null}
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eef1f7] text-[11px] font-bold text-[#3e4768]">
          {index || "Q"}
        </span>
        <span className="rounded-md bg-[#f1efff] px-2 py-0.5 font-semibold uppercase tracking-wide text-[#5f4ce6]">
          {question.question_type}
        </span>
        <span className="text-[#7f88a6]">{question.topic || "—"}</span>
        <span className="text-[#7f88a6]">{question.difficulty}</span>
        <span className="font-medium text-[#151d3a]">{question.marks} marks</span>
        {question.category?.title ? (
          <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[#5d6580]">{question.category.title}</span>
        ) : null}
        <span className="ml-auto text-[#99a0b7]">
          {question.created_at ? new Date(question.created_at).toLocaleString() : ""}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-[#1a2341]">{question.prompt}</p>
      {opts && Array.isArray(opts) ? (
        <ol className="mt-2 grid max-h-[260px] gap-1.5 overflow-y-auto pr-1 text-sm text-[#5d6580] sm:grid-cols-2">
          {opts.map((o, optIndex) => (
            <li key={`${o}-${optIndex}`} className="flex gap-2 rounded-lg bg-[#fafbff] px-3 py-2">
              <span className="shrink-0 font-semibold text-[#5f4ce6]">
                {String.fromCharCode(65 + optIndex)}.
              </span>
              <span className="min-w-0 break-words">{o}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 text-xs font-semibold text-[#6562f1] hover:underline"
      >
        {open ? "Hide model answer" : "Show model answer"}
      </button>
      {open ? (
        <p className="mt-2 rounded-lg bg-[#fafbff] px-3 py-2 text-sm text-[#5d6580]">{question.model_answer}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm font-semibold text-[#313a58]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(question)}
            className="ml-auto inline-flex items-center gap-1 rounded-xl border border-[#fbd8d8] bg-white px-3 py-2 text-sm font-semibold text-[#c94a4a]"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        ) : null}
      </div>
    </article>
  )
}
