import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ClipboardList,
  Folder,
  Layers,
  Search,
  Zap,
} from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import RenameDialog from "../../components/ui/RenameDialog"
import PublishExamModal from "../../components/exam/PublishExamModal"
import GeneratedPaperCard from "../../components/questions/GeneratedPaperCard"
import { fetchCategories } from "../../services/categoryService"
import {
  deleteExam,
  duplicateExam,
  fetchExamsGrouped,
  renameExam,
} from "../../services/examService"
import { displayExamTitle } from "../../utils/examTitle"

const ALL_ID = "__all__"
const UNCAT_ID = "__uncategorized__"

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

function resolveSubjectTitle(categoryId, categories, nestedCategory) {
  if (!categoryId || categoryId === UNCAT_ID) return "Uncategorized"
  const match = categories.find((c) => String(c.id) === String(categoryId))
  const candidate = String(match?.title ?? nestedCategory?.title ?? "").trim()
  if (!candidate || candidate === String(categoryId)) return "Unnamed Subject"
  return candidate
}

export default function TeacherMyExamsPage() {
  const navigate = useNavigate()
  const [activeSubject, setActiveSubject] = useState(ALL_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [groups, setGroups] = useState([])
  const [categories, setCategories] = useState([])
  const [query, setQuery] = useState("")
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null)
  const [pendingRenameExam, setPendingRenameExam] = useState(null)
  const [publishConfirmExam, setPublishConfirmExam] = useState(null)
  const [publishModalExam, setPublishModalExam] = useState(null)
  const [renameBusy, setRenameBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const [g, c] = await Promise.all([
          fetchExamsGrouped().catch((e) => {
            console.warn("Grouped exams failed:", e?.message)
            return []
          }),
          fetchCategories().catch(() => []),
        ])
        if (cancelled) return
        setGroups(g)
        setCategories(c)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load exams.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const subjects = useMemo(() => {
    const map = new Map()
    for (const c of categories) {
      map.set(c.id, {
        id: c.id,
        title: resolveSubjectTitle(c.id, categories, c),
        paperCount: 0,
      })
    }
    for (const g of groups) {
      const id = g.id || UNCAT_ID
      const title = resolveSubjectTitle(id === UNCAT_ID ? null : id, categories, { title: g.title })
      if (!map.has(id)) {
        map.set(id, { id, title, paperCount: 0 })
      }
      map.get(id).paperCount = g.exams.length
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    )
  }, [categories, groups])

  const totalPapers = useMemo(() => groups.reduce((n, g) => n + g.exams.length, 0), [groups])

  const filteredGroups = useMemo(() => {
    let g = groups
    if (activeSubject !== ALL_ID) g = g.filter((x) => x.id === activeSubject)

    const qLower = query.trim().toLowerCase()
    if (!qLower) return g
    return g
      .map((grp) => ({
        ...grp,
        exams: grp.exams.filter((e) => {
          const title = displayExamTitle(e.title).toLowerCase()
          const source = (e.source?.title || "").toLowerCase()
          return title.includes(qLower) || source.includes(qLower)
        }),
      }))
      .filter((grp) => grp.exams.length > 0)
  }, [groups, activeSubject, query])

  const onConfirmRenameExam = async (nextTitle) => {
    if (!pendingRenameExam || renameBusy) return
    setRenameBusy(true)
    try {
      const updated = await renameExam(pendingRenameExam.id, nextTitle)
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          exams: g.exams.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
        })),
      )
      setPendingRenameExam(null)
      showToast("Renamed")
    } catch (e) {
      showToast(e?.message || "Rename failed")
      throw e
    } finally {
      setRenameBusy(false)
    }
  }

  const onDuplicateExam = async (exam) => {
    try {
      const copyTitle = `${displayExamTitle(exam.title)} — Copy`
      const copy = await duplicateExam(exam.id, copyTitle)
      setGroups((prev) => {
        const key = exam.category_id || UNCAT_ID
        const next = prev.map((g) => ({ ...g, exams: g.exams.slice() }))
        let target = next.find((g) => (g.id || UNCAT_ID) === key)
        if (!target) {
          const id = copy.category_id || null
          target = {
            id,
            title: resolveSubjectTitle(id, categories, copy.category),
            exams: [],
          }
          next.push(target)
        }
        target.exams.unshift(copy)
        return next
      })
      showToast("Exam duplicated")
    } catch (e) {
      showToast(e?.message || "Duplicate failed")
    }
  }

  const onConfirmDeleteExam = async () => {
    if (!pendingDeleteExam) return
    const id = pendingDeleteExam.id
    setPendingDeleteExam(null)
    try {
      await deleteExam(id)
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, exams: g.exams.filter((e) => e.id !== id) }))
          .filter((g) => g.exams.length > 0 || g.id === null),
      )
      showToast("Exam deleted")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
  }

  const onPublished = () => {
    if (!publishModalExam) return
    const id = publishModalExam.id
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        exams: g.exams.map((e) => (e.id === id ? { ...e, status: "published" } : e)),
      })),
    )
    setPublishModalExam(null)
    showToast("Exam published")
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div>
        <h1 className="flex flex-wrap items-baseline gap-2 text-xl font-semibold text-[#151d3a] sm:text-2xl">
          My Exams
          {!loading && totalPapers > 0 ? (
            <span className="rounded-full bg-[#eef1f7] px-2.5 py-0.5 text-xs font-semibold text-[#7f88a6]">
              {totalPapers}
            </span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-[#7d86a5]">
          All your drafted and saved exams, ready to review and publish.
        </p>
      </div>

      {toast ? (
        <div
          key={toast.key}
          role="status"
          className="rounded-xl border border-[#cdebd9] bg-[#e8fbf3] px-3 py-2 text-sm font-medium text-[#1f9d67]"
        >
          {toast.text}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      ) : null}

      {!loading && totalPapers === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dbe0ee] bg-white px-6 py-16 text-center">
          <ClipboardList className="h-14 w-14 text-[#bcc2d8]" strokeWidth={1.25} />
          <p className="mt-4 text-lg font-semibold text-[#151d3a]">No exams yet</p>
          <p className="mt-2 max-w-md text-sm text-[#7f88a6]">
            Once you generate or compile an exam it will appear here for review and publishing.
          </p>
          <Link
            to="/teacher-dashboard/generate-exam"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#6562f1] px-5 text-sm font-semibold text-white transition hover:bg-[#5a56e2]"
          >
            <Zap className="h-4 w-4" />
            Generate my first exam
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm lg:col-span-3">
            <h2 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Subjects
            </h2>
            <nav className="mt-1 space-y-0.5">
              <SubjectItem
                icon={Layers}
                label="All subjects"
                count={totalPapers}
                active={activeSubject === ALL_ID}
                onClick={() => setActiveSubject(ALL_ID)}
              />
              <div className="my-2 border-t border-[#eef1f7]" />
              {subjects
                .filter((s) => s.id !== UNCAT_ID && s.paperCount > 0)
                .map((s) => (
                  <SubjectItem
                    key={s.id}
                    icon={Folder}
                    label={s.title}
                    count={s.paperCount}
                    active={activeSubject === s.id}
                    onClick={() => setActiveSubject(s.id)}
                  />
                ))}
            </nav>
          </aside>

          <section className="min-w-0 space-y-4 lg:col-span-9">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa3c2]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your exams..."
                  className="w-full rounded-xl border border-[#e3e6ef] bg-white py-2 pl-8 pr-3 text-sm focus:border-[#6562f1] focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <SectionSkeleton rows={4} />
            ) : (
              <PapersView
                groups={filteredGroups}
                categories={categories}
                activeSubject={activeSubject}
                hasAnyExams={totalPapers > 0}
                onReview={(exam) => navigate(`/teacher-dashboard/exams/${exam.id}/review`)}
                onRename={(exam) => setPendingRenameExam(exam)}
                onDuplicate={onDuplicateExam}
                onPublish={(exam) => setPublishConfirmExam(exam)}
                onDelete={(exam) => setPendingDeleteExam(exam)}
              />
            )}
          </section>
        </div>
      )}

      <RenameDialog
        open={Boolean(pendingRenameExam)}
        title="Rename exam"
        label="Exam title"
        helper="Use a clear title so this exam is easy to find later."
        initialValue={displayExamTitle(pendingRenameExam?.title)}
        confirmLabel="Save title"
        onConfirm={onConfirmRenameExam}
        onCancel={() => !renameBusy && setPendingRenameExam(null)}
      />

      <ConfirmDialog
        open={Boolean(publishConfirmExam)}
        title="Publish this exam?"
        message={
          <>
            <p>Publish this exam to students?</p>
            <p className="mt-2 text-[#5d6580]">
              Once published, students can attempt it immediately.
            </p>
          </>
        }
        confirmLabel="Publish"
        cancelLabel="Cancel"
        onConfirm={() => {
          setPublishModalExam(publishConfirmExam)
          setPublishConfirmExam(null)
        }}
        onCancel={() => setPublishConfirmExam(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteExam)}
        title="Delete this exam permanently?"
        message="This cannot be undone."
        destructive
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={onConfirmDeleteExam}
        onCancel={() => setPendingDeleteExam(null)}
      />

      <PublishExamModal
        open={Boolean(publishModalExam)}
        onClose={() => setPublishModalExam(null)}
        examTemplate={
          publishModalExam
            ? {
                id: publishModalExam.id,
                title: displayExamTitle(publishModalExam.title),
                category_id: publishModalExam.category_id,
                duration_minutes: publishModalExam.duration_minutes,
                total_questions: publishModalExam.total_questions,
                total_marks: publishModalExam.total_marks,
              }
            : null
        }
        onPublished={onPublished}
      />
    </div>
  )
}

function SubjectItem({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
        active ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#313a58] hover:bg-[#f6f7fc]",
      )}
    >
      <Icon className={classNames("h-4 w-4 shrink-0", active ? "text-[#5f4ce6]" : "text-[#7d86a5]")} />
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={classNames(
          "shrink-0 rounded-full px-2 text-[11px] font-semibold",
          active ? "bg-white/70 text-[#5f4ce6]" : "bg-[#f1f3f8] text-[#5d6580]",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function PapersView({
  groups,
  categories,
  activeSubject,
  hasAnyExams,
  onReview,
  onRename,
  onDuplicate,
  onPublish,
  onDelete,
}) {
  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center">
        <p className="text-sm font-semibold text-[#1a2341]">
          {hasAnyExams ? "No exams match your search" : "No exams yet"}
        </p>
        {hasAnyExams ? (
          <p className="mt-1 text-xs text-[#7f88a6]">Try a different search term or subject filter.</p>
        ) : null}
      </div>
    )
  }

  const showSubjectTitle = activeSubject === ALL_ID

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const groupTitle = resolveSubjectTitle(
          g.id === null ? null : g.id,
          categories,
          { title: g.title },
        )
        return (
          <section key={g.id || "uncategorized"}>
            {showSubjectTitle ? (
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
                <Folder className="h-4 w-4 text-[#7d86a5]" /> {groupTitle}
              </h3>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.exams.map((exam) => (
                <GeneratedPaperCard
                  key={exam.id}
                  exam={exam}
                  categoryTitle={resolveSubjectTitle(
                    exam.category_id,
                    categories,
                    exam.category,
                  )}
                  onReview={() => onReview(exam)}
                  onRename={() => onRename(exam)}
                  onDuplicate={() => onDuplicate(exam)}
                  onPublish={() => onPublish(exam)}
                  onDelete={() => onDelete(exam)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
