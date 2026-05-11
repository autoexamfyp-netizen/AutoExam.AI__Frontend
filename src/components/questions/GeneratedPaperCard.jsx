import { useState } from "react"
import {
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"

function relative(when) {
  if (!when) return ""
  const d = new Date(when)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

const DIFFICULTY_BADGE = {
  easy: "bg-[#e9f8f0] text-[#1f9d67]",
  medium: "bg-[#fff6e1] text-[#c89422]",
  hard: "bg-[#fdecec] text-[#c94a4a]",
  mixed: "bg-[#eef1f7] text-[#5d6580]",
}

/**
 * Card for a single generated paper (`exam`).
 *
 * @param {object} props
 * @param {object} props.exam   { id, title, total_marks, total_questions, difficulty, source }
 * @param {() => void} props.onView
 * @param {() => void} [props.onRename]
 * @param {() => void} [props.onDuplicate]
 * @param {() => void} [props.onDelete]
 */
export default function GeneratedPaperCard({ exam, onView, onRename, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const diffClass = DIFFICULTY_BADGE[exam.difficulty] || DIFFICULTY_BADGE.medium

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/30 hover:shadow-md">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#151d3a]">{exam.title}</h3>
          <p className="mt-0.5 text-xs text-[#7f88a6]">
            {exam.category?.title || "Uncategorized"}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="More"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="rounded-lg p-1.5 text-[#9aa3c2] opacity-0 transition group-hover:opacity-100 hover:bg-[#f6f7fc] aria-expanded:opacity-100"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                className="fixed inset-0 z-10"
              />
              <div
                role="menu"
                className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
              >
                {onRename ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      onRename()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </button>
                ) : null}
                {onDuplicate ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      onDuplicate()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      onDelete()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#c94a4a] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
          {exam.total_questions || 0} questions
        </span>
        <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
          {exam.total_marks || 0} marks
        </span>
        <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${diffClass}`}>
          {exam.difficulty || "medium"}
        </span>
        {exam.status && exam.status !== "draft" ? (
          <span className="rounded-full bg-[#e8fbf3] px-2 py-0.5 font-semibold text-[#1f9d67]">
            {exam.status}
          </span>
        ) : null}
      </div>

      {exam.source?.title ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8a93ad]">
          <FileText className="h-3 w-3" /> from “{exam.source.title}”
        </p>
      ) : null}

      <p className="mt-3 flex items-center gap-1 text-[11px] text-[#99a0b7]">
        <Clock className="h-3 w-3" /> {relative(exam.created_at)}
      </p>

      <button
        type="button"
        onClick={onView}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#151d3a] text-xs font-semibold text-white transition hover:bg-[#252f55]"
      >
        <Eye className="h-3.5 w-3.5" /> View questions
      </button>
    </article>
  )
}
