import { useState } from "react"
import { Heart, Pencil, Trash2 } from "lucide-react"

/**
 * Single question bank row.
 *
 * @param {object} props
 * @param {object} props.question
 * @param {(q: object) => void} [props.onEdit]
 * @param {(q: object) => void} [props.onDelete]
 * @param {(q: object) => void} [props.onToggleFavorite]
 */
export default function QuestionCard({ question, onEdit, onDelete, onToggleFavorite }) {
  const [open, setOpen] = useState(false)
  const opts = question.options

  return (
    <article className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-2 text-xs">
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
        <ul className="mt-2 space-y-1 text-sm text-[#5d6580]">
          {opts.map((o) => (
            <li key={o}>· {o}</li>
          ))}
        </ul>
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
        {onToggleFavorite ? (
          <button
            type="button"
            onClick={() => onToggleFavorite(question)}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
              question.favorite ? "border-[#6562f1] bg-[#f1efff] text-[#5f4ce6]" : "border-[#e3e6ef] bg-white text-[#313a58]"
            }`}
          >
            <Heart className={`h-4 w-4 ${question.favorite ? "fill-current" : ""}`} />
            {question.favorite ? "Favorited" : "Favorite"}
          </button>
        ) : null}
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
