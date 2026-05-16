import { useState } from "react"
import {
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
} from "lucide-react"
import {
  displayExamTitle,
  examStatusBadgeClass,
  formatExamSourceLabel,
  resolveExamStatusLabel,
} from "../../utils/examTitle"

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

export default function GeneratedPaperCard({
  exam,
  categoryTitle,
  onReview,
  onRename,
  onDuplicate,
  onPublish,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  if (!exam?.id) return null

  const displayTitle = displayExamTitle(exam.title)
  const statusLabel = resolveExamStatusLabel(exam)
  const statusClass = examStatusBadgeClass(exam)
  const diffClass = DIFFICULTY_BADGE[exam.difficulty] || DIFFICULTY_BADGE.medium
  const sourceLabel = formatExamSourceLabel(exam.source)
  const subjectLabel = categoryTitle || exam.category?.title || "Uncategorized"

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/30 hover:shadow-md">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#151d3a]" title={displayTitle}>
            {displayTitle}
          </h3>
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
          >
            {statusLabel}
          </span>
          <p className="mt-1 truncate text-xs text-[#7f88a6]" title={subjectLabel}>
            {subjectLabel}
          </p>
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
      </div>

      {sourceLabel ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8a93ad]">
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{sourceLabel}</span>
        </p>
      ) : null}

      <p className="mt-3 flex items-center gap-1 text-[11px] text-[#99a0b7]">
        <Clock className="h-3 w-3" /> {relative(exam.created_at)}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onReview}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#6562f1] bg-white text-xs font-semibold text-[#5f4ce6] transition hover:bg-[#f1efff]"
        >
          <Eye className="h-3.5 w-3.5" />
          Review
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="More actions"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e3e6ef] bg-white text-[#5d6580] transition hover:bg-[#fafbff]"
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
                className="absolute bottom-full right-0 z-20 mb-1 w-44 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
              >
                <MenuItem
                  label="Rename"
                  icon={Pencil}
                  onClick={() => {
                    closeMenu()
                    onRename?.()
                  }}
                />
                <MenuItem
                  label="Duplicate"
                  icon={Copy}
                  onClick={() => {
                    closeMenu()
                    onDuplicate?.()
                  }}
                />
                {onPublish ? (
                  <MenuItem
                    label="Publish"
                    icon={Send}
                    onClick={() => {
                      closeMenu()
                      onPublish()
                    }}
                  />
                ) : null}
                <div className="my-1 border-t border-[#eef1f7]" />
                <MenuItem
                  label="Delete"
                  icon={Trash2}
                  danger
                  onClick={() => {
                    closeMenu()
                    onDelete?.()
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function MenuItem({ label, icon: Icon, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff] ${
        danger ? "text-[#c94a4a] hover:bg-red-50" : "text-[#313a58]"
      }`}
    >
      {Icon ? (
        <Icon className={`h-3.5 w-3.5 shrink-0 ${danger ? "" : "text-[#7d86a5]"}`} />
      ) : null}
      {label}
    </button>
  )
}
