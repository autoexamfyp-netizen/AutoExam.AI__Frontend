import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import RenameDialog from "../../components/ui/RenameDialog"
import PublishExamModal from "../../components/exam/PublishExamModal"
import {
  deletePublishedExam,
  fetchPublishedExams,
  fetchPublishedSubmissionCounts,
  updatePublishedExam,
} from "../../services/publishedExamService"
import { duplicateExam } from "../../services/examService"
import { displayExamTitle } from "../../utils/examTitle"

const STATUS = {
  ALL: "all",
  ACTIVE: "active",
  UPCOMING: "upcoming",
  EXPIRED: "expired",
  UNPUBLISHED: "unpublished",
}

const SORT = {
  NEWEST: "newest",
  OLDEST: "oldest",
  START_SOON: "start_soon",
  END_SOON: "end_soon",
}

function fmt(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function statusOf(now, p) {
  if (!p.is_active) return STATUS.UNPUBLISHED
  const start = new Date(p.start_time).getTime()
  const end = new Date(p.end_time).getTime()
  if (now < start) return STATUS.UPCOMING
  if (now > end) return STATUS.EXPIRED
  return STATUS.ACTIVE
}

function statusBadge(status) {
  switch (status) {
    case STATUS.ACTIVE:
      return { label: "Active", className: "bg-[#e8fbf3] text-[#1f9d67]" }
    case STATUS.UPCOMING:
      return { label: "Upcoming", className: "bg-[#edf3ff] text-[#3f67c8]" }
    case STATUS.EXPIRED:
      return { label: "Expired", className: "bg-[#f1f3f8] text-[#5d6580]" }
    case STATUS.UNPUBLISHED:
      return { label: "Unpublished", className: "bg-[#fff6e1] text-[#c89422]" }
    default:
      return { label: "—", className: "bg-[#f1f3f8] text-[#5d6580]" }
  }
}

export default function TeacherPublishedExamsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)

  const [statusFilter, setStatusFilter] = useState(STATUS.ALL)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState(SORT.NEWEST)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [menuId, setMenuId] = useState(null)

  const [publishFor, setPublishFor] = useState(null)
  const [editingPublished, setEditingPublished] = useState(null)
  // When true, after the edit-schedule modal successfully saves, also flip
  // `is_active` back to true (used for "Reschedule & publish" on expired or
  // unpublished exams).
  const [republishAfterEdit, setRepublishAfterEdit] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [renameBusy, setRenameBusy] = useState(false)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const [extending, setExtending] = useState(null) // { p, minutes }
  const [toast, setToast] = useState(null)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [list, c] = await Promise.all([
        fetchPublishedExams(),
        fetchPublishedSubmissionCounts(),
      ])
      setRows(list)
      setCounts(c)
    } catch (e) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Unable to connect. Please try again."
          : e?.message || "Could not load published exams.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  // Re-evaluate status badges every 30s so Upcoming → Active transitions show
  // without a manual refresh.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  // ---------- DERIVED ----------

  const decorated = useMemo(
    () => rows.map((p) => ({ ...p, _status: statusOf(now, p) })),
    [rows, now],
  )

  const summary = useMemo(() => {
    const s = { total: decorated.length, active: 0, upcoming: 0, expired: 0, unpublished: 0 }
    for (const p of decorated) {
      if (p._status === STATUS.ACTIVE) s.active += 1
      else if (p._status === STATUS.UPCOMING) s.upcoming += 1
      else if (p._status === STATUS.EXPIRED) s.expired += 1
      else if (p._status === STATUS.UNPUBLISHED) s.unpublished += 1
    }
    return s
  }, [decorated])

  const filtered = useMemo(() => {
    let list = decorated
    if (statusFilter !== STATUS.ALL) list = list.filter((p) => p._status === statusFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category?.title || "").toLowerCase().includes(q),
      )
    }
    const sorted = list.slice()
    sorted.sort((a, b) => {
      switch (sort) {
        case SORT.OLDEST:
          return new Date(a.created_at || a.start_time) - new Date(b.created_at || b.start_time)
        case SORT.START_SOON:
          return new Date(a.start_time) - new Date(b.start_time)
        case SORT.END_SOON:
          return new Date(a.end_time) - new Date(b.end_time)
        case SORT.NEWEST:
        default:
          return new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time)
      }
    })
    return sorted
  }, [decorated, statusFilter, query, sort])

  const visibleIds = useMemo(() => filtered.map((p) => p.id), [filtered])
  const selectedInView = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)).length,
    [visibleIds, selectedIds],
  )
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  // ---------- ACTIONS ----------

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelectedIds(new Set())
  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      }
      const next = new Set(prev)
      visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  const optimisticPatch = (id, patch) => {
    setRows((curr) => curr.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const onUnpublish = async (p) => {
    setMenuId(null)
    try {
      await updatePublishedExam(p.id, { is_active: false })
      optimisticPatch(p.id, { is_active: false })
      showToast("Exam unpublished — students no longer see it.")
    } catch (e) {
      showToast(e?.message || "Failed to unpublish")
      setRefreshKey((k) => k + 1)
    }
  }

  const onRepublish = async (p) => {
    setMenuId(null)
    // Expired exams need a new window before they can go live again.
    if (p._status === STATUS.EXPIRED) {
      setRepublishAfterEdit(true)
      setEditingPublished(p)
      return
    }
    try {
      await updatePublishedExam(p.id, { is_active: true })
      optimisticPatch(p.id, { is_active: true })
      showToast("Exam is live again.")
    } catch (e) {
      showToast(e?.message || "Failed to publish again")
      setRefreshKey((k) => k + 1)
    }
  }

  const onExtend = async (p, minutes) => {
    setMenuId(null)
    setExtending({ id: p.id, minutes })
    try {
      const newEnd = new Date(new Date(p.end_time).getTime() + minutes * 60_000)
      const patched = await updatePublishedExam(p.id, { end_time: newEnd.toISOString() })
      optimisticPatch(p.id, { end_time: patched?.end_time || newEnd.toISOString() })
      showToast(`Deadline extended by ${minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`}.`)
    } catch (e) {
      showToast(e?.message || "Could not extend deadline")
      setRefreshKey((k) => k + 1)
    } finally {
      setExtending(null)
    }
  }

  const onRename = (p) => {
    setMenuId(null)
    setRenaming(p)
  }

  const onConfirmRename = async (next) => {
    if (!renaming) return
    setRenameBusy(true)
    try {
      const updated = await updatePublishedExam(renaming.id, { title: next })
      optimisticPatch(renaming.id, { title: updated?.title || next })
      showToast("Renamed")
      setRenaming(null)
    } catch (e) {
      showToast(e?.message || "Rename failed")
      throw e
    } finally {
      setRenameBusy(false)
    }
  }

  const onDuplicateTemplate = async (p) => {
    setMenuId(null)
    try {
      const ex = p.exam || {}
      const copy = await duplicateExam(p.generated_exam_id, `${ex.title || p.title} (copy)`)
      setPublishFor({
        id: copy.id,
        title: copy.title,
        category_id: copy.category_id ?? p.category_id,
        duration_minutes: p.duration_minutes,
        total_questions: copy.total_questions ?? p.total_questions,
        total_marks: copy.total_marks ?? p.total_marks,
      })
    } catch (e) {
      showToast(e?.message || "Duplicate failed")
    }
  }

  const onConfirmDelete = async () => {
    if (!pendingDelete || deleteBusy) return
    setDeleteBusy(true)
    try {
      await deletePublishedExam(pendingDelete.id)
      setRows((curr) => curr.filter((r) => r.id !== pendingDelete.id))
      setSelectedIds((prev) => {
        if (!prev.has(pendingDelete.id)) return prev
        const next = new Set(prev)
        next.delete(pendingDelete.id)
        return next
      })
      setPendingDelete(null)
      showToast("Published exam removed.")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    } finally {
      setDeleteBusy(false)
    }
  }

  const onConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length || bulkBusy) return
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => deletePublishedExam(id)))
      const removed = new Set(
        results.flatMap((r, i) => (r.status === "fulfilled" ? [ids[i]] : [])),
      )
      const failed = results.filter((r) => r.status === "rejected").length
      setRows((curr) => curr.filter((r) => !removed.has(r.id)))
      setSelectedIds(new Set())
      setPendingBulkDelete(false)
      if (failed) showToast(`${removed.size} removed · ${failed} failed`)
      else showToast(`${removed.size} published exam${removed.size === 1 ? "" : "s"} removed.`)
    } catch (e) {
      showToast(e?.message || "Bulk delete failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const onBulkSetActive = async (active) => {
    const ids = Array.from(selectedIds)
    if (!ids.length || bulkBusy) return
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) => updatePublishedExam(id, { is_active: active })),
      )
      const okIds = results.flatMap((r, i) => (r.status === "fulfilled" ? [ids[i]] : []))
      const failed = results.filter((r) => r.status === "rejected").length
      setRows((curr) =>
        curr.map((r) => (okIds.includes(r.id) ? { ...r, is_active: active } : r)),
      )
      if (failed) showToast(`${okIds.length} updated · ${failed} failed`)
      else showToast(`${okIds.length} ${active ? "republished" : "unpublished"}.`)
    } catch (e) {
      showToast(e?.message || "Bulk update failed")
    } finally {
      setBulkBusy(false)
    }
  }

  // ---------- RENDER ----------

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Published exams</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            Schedule, reschedule, unpublish, or remove exams — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-10 items-center rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] hover:bg-[#fafbff]"
          >
            Refresh
          </button>
          
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Upcoming" value={summary.upcoming} />
        <SummaryCard label="Expired" value={summary.expired} />
        <SummaryCard label="Unpublished" value={summary.unpublished} />
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
          <div className="min-w-0 flex-1 break-words">{error}</div>
        </div>
      ) : null}

      {/* TOOLBAR */}
      <div className="rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={statusFilter === STATUS.ALL}
            onClick={() => setStatusFilter(STATUS.ALL)}
            label="All"
            count={summary.total}
          />
          <FilterChip
            active={statusFilter === STATUS.ACTIVE}
            onClick={() => setStatusFilter(STATUS.ACTIVE)}
            label="Active"
            count={summary.active}
            tone="green"
          />
          <FilterChip
            active={statusFilter === STATUS.UPCOMING}
            onClick={() => setStatusFilter(STATUS.UPCOMING)}
            label="Upcoming"
            count={summary.upcoming}
            tone="blue"
          />
          <FilterChip
            active={statusFilter === STATUS.EXPIRED}
            onClick={() => setStatusFilter(STATUS.EXPIRED)}
            label="Expired"
            count={summary.expired}
            tone="gray"
          />
          <FilterChip
            active={statusFilter === STATUS.UNPUBLISHED}
            onClick={() => setStatusFilter(STATUS.UNPUBLISHED)}
            label="Unpublished"
            count={summary.unpublished}
            tone="amber"
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title / subject…"
              className="h-10 w-56 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm focus:border-[#6562f1] focus:outline-none"
            />
            <div className="inline-flex items-center rounded-xl border border-[#e3e6ef] bg-white px-2 py-1 text-xs text-[#5d6580]">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#313a58] focus:outline-none"
              >
                <option value={SORT.NEWEST}>Newest</option>
                <option value={SORT.OLDEST}>Oldest</option>
                <option value={SORT.START_SOON}>Start soon</option>
                <option value={SORT.END_SOON}>Ends soon</option>
              </select>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#f6f7fc] px-3 py-2 text-sm">
            <span className="font-semibold text-[#151d3a]">{selectedIds.size}</span>
            <span className="text-[#5d6580]">
              selected{selectedInView !== selectedIds.size ? ` · ${selectedInView} in view` : ""}
            </span>
            <button
              type="button"
              onClick={selectAllVisible}
              className="ml-auto inline-flex h-8 items-center rounded-lg border border-[#e3e6ef] bg-white px-2.5 text-xs font-semibold text-[#313a58] hover:bg-white/80"
            >
              {allVisibleSelected ? "Deselect visible" : `Select visible (${visibleIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => onBulkSetActive(true)}
              disabled={bulkBusy}
              className="inline-flex h-8 items-center rounded-lg border border-[#e3e6ef] bg-white px-2.5 text-xs font-semibold text-[#1f9d67] hover:bg-white/80 disabled:opacity-60"
            >
              {bulkBusy ? "Publishing…" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => onBulkSetActive(false)}
              disabled={bulkBusy}
              className="inline-flex h-8 items-center rounded-lg border border-[#e3e6ef] bg-white px-2.5 text-xs font-semibold text-[#c89422] hover:bg-white/80 disabled:opacity-60"
            >
              {bulkBusy ? "Unpublishing…" : "Unpublish"}
            </button>
            <button
              type="button"
              onClick={() => setPendingBulkDelete(true)}
              disabled={bulkBusy}
              className="inline-flex h-8 items-center rounded-lg border border-[#fbd8d8] bg-white px-2.5 text-xs font-semibold text-[#c94a4a] hover:bg-red-50 disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex h-8 items-center rounded-lg border border-[#e3e6ef] bg-white px-2.5 text-xs font-semibold text-[#5d6580] hover:bg-white/80"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState statusFilter={statusFilter} query={query} totalRows={rows.length} />
        ) : (
          filtered.map((p) => {
            const status = p._status
            const badge = statusBadge(status)
            const c = counts[p.id] || { total: 0, submitted: 0 }
            const subj = p.category?.title || "Uncategorized"
            const selected = selectedIds.has(p.id)
            return (
              <article
                key={p.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  selected ? "border-[#6562f1]" : "border-[#e7eaf3]"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.title}`}
                    checked={selected}
                    onChange={() => toggleSelect(p.id)}
                    className="mt-1.5 h-4 w-4 cursor-pointer accent-[#6562f1]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[#151d3a]">
                        {displayExamTitle(p.title)}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7f88a6]">{subj}</p>
                    {p.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-[#8a93ad]">{p.description}</p>
                    ) : null}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                      className="rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5d6580] hover:bg-[#f6f7fc]"
                      aria-label="More actions"
                    >
                      More
                    </button>
                    {menuId === p.id ? (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuId(null)}
                          aria-label="Close menu"
                        />
                        <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-[0_8px_30px_rgba(15,23,48,0.12)]">
                          <MenuButton onClick={() => onRename(p)}>Rename</MenuButton>
                          <MenuButton
                            onClick={() => {
                              setMenuId(null)
                              setEditingPublished(p)
                            }}
                          >
                            Edit schedule
                          </MenuButton>
                          {status === STATUS.ACTIVE ? (
                            <>
                              <MenuButton onClick={() => onExtend(p, 15)}>Extend by 15 min</MenuButton>
                              <MenuButton onClick={() => onExtend(p, 60)}>Extend by 1 hour</MenuButton>
                              <MenuButton onClick={() => onExtend(p, 60 * 24)}>Extend by 1 day</MenuButton>
                            </>
                          ) : null}
                          <MenuButton onClick={() => onDuplicateTemplate(p)}>
                            Duplicate &amp; reschedule
                          </MenuButton>
                          <Link
                            to={`/teacher-dashboard/exams/${p.generated_exam_id}/review`}
                            onClick={() => setMenuId(null)}
                            className="block w-full px-3 py-2 text-left text-[#313a58] hover:bg-[#fafbff]"
                          >
                            Open template
                          </Link>
                          <div className="my-1 border-t border-[#eef1f7]" />
                          <MenuButton
                            destructive
                            onClick={() => {
                              setMenuId(null)
                              setPendingDelete(p)
                            }}
                          >
                            Delete
                          </MenuButton>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-1.5 text-sm text-[#5d6580] sm:grid-cols-2">
                  <div>
                    {p.total_questions ?? 0} questions · {p.total_marks ?? 0} marks
                  </div>
                  <div>{p.duration_minutes} min allowed</div>
                  <div>
                    {c.submitted}/{c.total || 0} submitted
                  </div>
                  <div className="sm:col-span-2">
                    {fmt(p.start_time)} → {fmt(p.end_time)}
                  </div>
                </dl>

                {/* PRIMARY ACTIONS */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/teacher-dashboard/submissions?published=${p.id}`}
                    className="inline-flex h-9 items-center rounded-xl bg-[#151d3a] px-3 text-xs font-semibold text-white hover:bg-[#252f55]"
                  >
                    View submissions ({c.submitted}/{c.total || 0})
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingPublished(p)}
                    className="inline-flex h-9 items-center rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
                  >
                    Edit schedule
                  </button>
                  {p.is_active ? (
                    <button
                      type="button"
                      onClick={() => onUnpublish(p)}
                      className="inline-flex h-9 items-center rounded-xl border border-[#ffe5bf] bg-white px-3 text-xs font-semibold text-[#c89422] hover:bg-[#fff8ec]"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRepublish(p)}
                      className="inline-flex h-9 items-center rounded-xl border border-[#cdebd9] bg-white px-3 text-xs font-semibold text-[#1f9d67] hover:bg-[#f0fbf6]"
                    >
                      {status === STATUS.EXPIRED ? "Reschedule & publish" : "Publish again"}
                    </button>
                  )}
                  {extending?.id === p.id ? (
                    <span className="inline-flex h-9 items-center rounded-xl bg-[#f6f7fc] px-3 text-xs font-semibold text-[#5d6580]">
                      Extending…
                    </span>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* MODALS */}
      <PublishExamModal
        open={Boolean(publishFor)}
        examTemplate={publishFor || {}}
        onClose={() => setPublishFor(null)}
        onPublished={() => {
          showToast("Scheduled")
          setPublishFor(null)
          setRefreshKey((k) => k + 1)
        }}
      />

      <PublishExamModal
        mode="edit"
        existingPublished={
          editingPublished
            ? {
                id: editingPublished.id,
                start_time: editingPublished.start_time,
                end_time: editingPublished.end_time,
                duration_minutes: editingPublished.duration_minutes,
                allow_one_attempt: editingPublished.allow_one_attempt,
                shuffle_questions: editingPublished.shuffle_questions,
                auto_submit_on_timeout: editingPublished.auto_submit_on_timeout,
                show_results_immediately: editingPublished.show_results_immediately,
              }
            : null
        }
        open={Boolean(editingPublished)}
        examTemplate={{
          id: editingPublished?.generated_exam_id,
          title: editingPublished?.title,
          category_id: editingPublished?.category_id,
          duration_minutes: editingPublished?.duration_minutes,
          total_questions: editingPublished?.total_questions,
          total_marks: editingPublished?.total_marks,
        }}
        onClose={() => {
          setEditingPublished(null)
          setRepublishAfterEdit(false)
        }}
        onPublished={async () => {
          // After dates are saved, optionally flip `is_active` back on so the
          // exam transitions from Expired/Unpublished back to Active/Upcoming.
          if (republishAfterEdit && editingPublished?.id) {
            try {
              await updatePublishedExam(editingPublished.id, { is_active: true })
              optimisticPatch(editingPublished.id, { is_active: true })
              showToast("Exam rescheduled and live again.")
            } catch (e) {
              showToast(e?.message || "Saved schedule, but failed to publish again.")
            }
          } else {
            showToast("Schedule updated")
          }
          setRepublishAfterEdit(false)
          setEditingPublished(null)
          setRefreshKey((k) => k + 1)
        }}
      />

      <RenameDialog
        open={Boolean(renaming)}
        title="Rename published exam"
        label="Exam title"
        placeholder="e.g. Discrete Math — Midterm 2"
        initialValue={renaming?.title || ""}
        confirmLabel="Save"
        onConfirm={onConfirmRename}
        onCancel={() => !renameBusy && setRenaming(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this published exam?"
        destructive
        busy={deleteBusy}
        message={
          <>
            <p>
              <strong className="text-[#151d3a]">
                {pendingDelete?.title?.trim() || "This exam"}
              </strong>{" "}
              will be removed from the published list. Students will no longer see it.
            </p>
            <p className="mt-2 text-xs text-[#7f88a6]">
              Existing submissions stay in the database for your records.
            </p>
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={onConfirmDelete}
        onCancel={() => !deleteBusy && setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingBulkDelete}
        title={`Delete ${selectedIds.size} published exam${selectedIds.size === 1 ? "" : "s"}?`}
        destructive
        busy={bulkBusy}
        message={
          <>
            <p>This removes the selected schedules permanently.</p>
            <p className="mt-2 text-xs text-[#7f88a6]">
              Stored submissions are kept; you simply lose the schedule and its access window.
            </p>
          </>
        }
        confirmLabel={`Delete ${selectedIds.size}`}
        cancelLabel="Keep"
        onConfirm={onConfirmBulkDelete}
        onCancel={() => !bulkBusy && setPendingBulkDelete(false)}
      />
    </div>
  )
}

// ---------- SMALL COMPONENTS ----------

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#151d3a]">{value}</p>
    </div>
  )
}

const TONE = {
  green: "border-[#cdebd9] bg-[#e8fbf3] text-[#1f9d67]",
  blue: "border-[#cad8f6] bg-[#edf3ff] text-[#3f67c8]",
  gray: "border-[#dfe3ee] bg-[#f1f3f8] text-[#5d6580]",
  amber: "border-[#ffe5bf] bg-[#fff6e1] text-[#c89422]",
  default: "border-[#dbd9ff] bg-[#f1efff] text-[#5f4ce6]",
}

function FilterChip({ active, onClick, label, count, tone = "default" }) {
  const toneClass = TONE[tone] || TONE.default
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
        active
          ? toneClass
          : "border-[#e3e6ef] bg-white text-[#5d6580] hover:bg-[#fafbff]"
      }`}
    >
      {label}
      <span className="text-[#9aa3c2]">({count})</span>
    </button>
  )
}

function MenuButton({ children, onClick, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm ${
        destructive
          ? "text-[#c94a4a] hover:bg-red-50"
          : "text-[#313a58] hover:bg-[#fafbff]"
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ statusFilter, query, totalRows }) {
  let title
  let body
  if (totalRows === 0) {
    title = "No published exams yet"
    body = (
      <>
        Open an exam in <span className="font-semibold">Generated Exams</span> and click{" "}
        <span className="font-semibold">Publish</span> to schedule it.
      </>
    )
  } else if (query) {
    title = "No matches"
    body = <>No published exams match &ldquo;{query}&rdquo;. Try a different search.</>
  } else if (statusFilter !== STATUS.ALL) {
    title = `No ${statusFilter} exams`
    body = <>Switch the status filter to see exams in other states.</>
  } else {
    title = "Nothing here"
    body = <>Adjust your filters to see published exams.</>
  }
  return (
    <div className="rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center">
      <p className="text-sm font-semibold text-[#1a2341]">{title}</p>
      <p className="mt-1 text-xs text-[#7f88a6]">{body}</p>
    </div>
  )
}
