import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, FolderOpen, Plus, Search, Sparkles, StickyNote } from "lucide-react"
import ContentList, { displayNoteTitle } from "./ContentList"
import SectionSkeleton from "../ui/SectionSkeleton"
import {
  MATERIALS_WORKSPACE_PANEL_EMPTY,
  MATERIALS_WORKSPACE_PANEL_PAD,
} from "./materialsWorkspaceStyles"
import { sanitizeNoteContent, sanitizeNoteTitle } from "./noteUtils"
import MoveMaterialDialog from "../ui/MoveMaterialDialog"
import TextEditor from "./TextEditor"
import CategorySidebar from "./CategorySidebar"
import ConfirmDialog from "../student/ConfirmDialog"
import {
  createTextMaterial,
  deleteTextMaterial,
  duplicateTextMaterial,
  fetchQuestionCountsByText,
  fetchTextMaterials,
  updateTextMaterial,
} from "../../services/contentService"

const ALL_ID = CategorySidebar.ALL_ID

const AUTOSAVE_DELAY_MS = 4000

const DRAFT_DEFAULT = { id: null, title: "", content: "", categoryId: null }

/**
 * Text-first materials workflow: create / preview / edit / generate.
 *
 * Differences from the v1 studio:
 * - Multiple drafts via "New content" + per-card actions (rename / duplicate / delete)
 * - Dirty tracking + autosave (4 s debounce) for existing notes
 * - Edit / Preview tabs with lightweight Markdown rendering
 * - Live save status pill (Unsaved / Saving / Saved ✓ / Save failed)
 * - Question counts per note, sourced from question_bank
 *
 * @param {object} props
 * @param {object[]} props.categoriesWithCounts
 * @param {boolean} props.categoriesLoading
 * @param {string} props.activeNavId              Sidebar selection (ALL_ID | category uuid)
 * @param {(id: string) => void} props.onSelectNav
 * @param {() => void} props.onCreateCategory
 * @param {(c: object) => void} props.onEditCategory
 * @param {(c: object) => void} props.onDeleteCategory
 * @param {(tone: 'success'|'error', msg: string) => void} props.showToast
 */
export default function TextStudio({
  categoriesWithCounts,
  categoriesLoading,
  activeNavId,
  onSelectNav,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  showToast,
}) {
  const [listLoading, setListLoading] = useState(true)
  const [items, setItems] = useState([])
  const [questionCounts, setQuestionCounts] = useState(() => new Map())

  // Editor state
  const [draftId, setDraftId] = useState(null)         // null until saved (means "new")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [isNewDraft, setIsNewDraft] = useState(false)  // true when New content was clicked
  const [originalSnapshot, setOriginalSnapshot] = useState(DRAFT_DEFAULT)
  const [mode, setMode] = useState("edit")             // "edit" | "preview"

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("idle") // idle | dirty | saving | saved | error
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingMoveNote, setPendingMoveNote] = useState(null)
  const [moveNoteBusy, setMoveNoteBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [query, setQuery] = useState("")

  const autosaveTimerRef = useRef(null)
  const savedFlashTimerRef = useRef(null)

  /* ----------------------- LOAD list whenever folder changes ---------------- */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      try {
        let rows
        if (activeNavId === ALL_ID) rows = await fetchTextMaterials({})
        else rows = await fetchTextMaterials({ categoryId: activeNavId })
        if (cancelled) return
        setItems(rows)

        const ids = rows.map((r) => r.id)
        const counts = await fetchQuestionCountsByText(ids)
        if (!cancelled) setQuestionCounts(counts)
      } catch (e) {
        if (!cancelled) showToast("error", e?.message || "Could not load text notes.")
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeNavId, showToast])

  useEffect(() => {
    setQuery("")
  }, [activeNavId])

  /* ----------------------- Dirty / autosave wiring -------------------------- */
  const isDirty = useMemo(() => {
    if (!draftId && !isNewDraft) return false
    return (
      title !== originalSnapshot.title ||
      content !== originalSnapshot.content ||
      categoryId !== originalSnapshot.categoryId
    )
  }, [draftId, isNewDraft, title, content, categoryId, originalSnapshot])

  // Status shown in the editor toolbar — derived from saving / dirty / last save outcome.
  const displayedSaveStatus = saving
    ? "saving"
    : saveStatus === "saved" || saveStatus === "error"
      ? saveStatus
      : isDirty
        ? "dirty"
        : "idle"

  /* ----------------------- Helpers ----------------------------------------- */
  const categoryTitle = useMemo(() => {
    if (!categoryId) return null
    return categoriesWithCounts.find((c) => c.id === categoryId)?.title ?? null
  }, [categoriesWithCounts, categoryId])

  const updateLocalRow = useCallback((row) => {
    setItems((curr) => {
      const filtered = curr.filter((r) => r.id !== row.id)
      return [row, ...filtered]
    })
  }, [])

  const flashSaved = useCallback(() => {
    setSaveStatus("saved")
    if (savedFlashTimerRef.current) window.clearTimeout(savedFlashTimerRef.current)
    savedFlashTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle")
    }, 1800)
  }, [])

  /* ----------------------- Selection & creation ---------------------------- */
  const loadIntoEditor = useCallback((row, { initialMode = "preview" } = {}) => {
    const cleanTitle = sanitizeNoteTitle(row.title)
    const cleanContent = sanitizeNoteContent(row.content)
    setDraftId(row.id)
    setIsNewDraft(false)
    setTitle(cleanTitle)
    setContent(cleanContent)
    setCategoryId(row.category_id ?? null)
    setOriginalSnapshot({
      id: row.id,
      title: cleanTitle,
      content: cleanContent,
      categoryId: row.category_id ?? null,
    })
    setSaveStatus("idle")
    setMode(initialMode)
  }, [])

  const handleSelectRow = (row) => {
    if (row.id === draftId) {
      if (mode === "preview") return
      setMode("preview")
      return
    }
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    loadIntoEditor(row, { initialMode: "preview" })
  }

  const handleEditRow = (row) => {
    if (row.id === draftId && mode === "edit") return
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    loadIntoEditor(row, { initialMode: "edit" })
  }

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    setDraftId(null)
    setIsNewDraft(true)
    setTitle("")
    setContent("")
    if (activeNavId !== ALL_ID) {
      setCategoryId(activeNavId)
    } else {
      setCategoryId(categoriesWithCounts[0]?.id ?? null)
    }
    setOriginalSnapshot({ id: null, title: "", content: "", categoryId: null })
    setSaveStatus("idle")
    setMode("edit")
  }, [activeNavId, categoriesWithCounts, isDirty])

  const closeEditor = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    setDraftId(null)
    setIsNewDraft(false)
    setTitle("")
    setContent("")
    setCategoryId(null)
    setOriginalSnapshot(DRAFT_DEFAULT)
    setSaveStatus("idle")
  }, [isDirty])

  const handleCancelEdit = useCallback(() => {
    if (isNewDraft && !draftId) {
      closeEditor()
      return
    }
    setTitle(originalSnapshot.title)
    setContent(originalSnapshot.content)
    setCategoryId(originalSnapshot.categoryId)
    setSaveStatus("idle")
    setMode("preview")
  }, [isNewDraft, draftId, originalSnapshot, closeEditor])

  /* ----------------------- Save (manual + autosave) ------------------------ */
  const performSave = useCallback(
    async ({ silent = false, openPreviewAfter = false } = {}) => {
      const saveTitle = title.trim()
      const saveContent = sanitizeNoteContent(content)
      const missing = []
      if (!saveTitle) missing.push("title")
      if (!categoryId) missing.push("subject")
      if (!saveContent.trim()) missing.push("course notes")
      if (missing.length) {
        const msg = `Add a ${missing.join(" and ")} before saving.`
        if (!silent) showToast("error", msg)
        return null
      }
      setSaving(true)
      setSaveStatus("saving")
      try {
        let row
        if (draftId) {
          row = await updateTextMaterial(draftId, { title: saveTitle, content: saveContent, categoryId })
        } else {
          row = await createTextMaterial({ title: saveTitle, content: saveContent, categoryId })
          setDraftId(row.id)
          setIsNewDraft(false)
        }
        const cleanTitle = sanitizeNoteTitle(row.title)
        const cleanBody = sanitizeNoteContent(row.content)
        setTitle(cleanTitle)
        setContent(cleanBody)
        updateLocalRow(row)
        setOriginalSnapshot({
          id: row.id,
          title: cleanTitle,
          content: cleanBody,
          categoryId: row.category_id ?? null,
        })
        flashSaved()
        if (!silent) showToast("success", "Note saved")
        if (openPreviewAfter) setMode("preview")
        return row
      } catch (e) {
        setSaveStatus("error")
        if (!silent) showToast("error", e?.message || "Save failed")
        return null
      } finally {
        setSaving(false)
      }
    },
    [draftId, title, content, categoryId, showToast, updateLocalRow, flashSaved],
  )

  // Autosave only for existing rows (not brand-new drafts) when dirty.
  useEffect(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    if (!draftId || mode !== "edit") return
    if (!isDirty) return
    if (!title.trim() || !sanitizeNoteContent(content).trim() || !categoryId) return
    autosaveTimerRef.current = window.setTimeout(() => {
      performSave({ silent: true })
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [draftId, mode, isDirty, title, content, categoryId, performSave])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      if (savedFlashTimerRef.current) window.clearTimeout(savedFlashTimerRef.current)
    }
  }, [])

  /* ----------------------- Per-row actions --------------------------------- */
  const noteLeavesFolder = useCallback((navId, row) => {
    if (navId === ALL_ID) return false
    return row.category_id !== navId
  }, [])

  const handleMoveNote = useCallback((row) => {
    setPendingMoveNote(row)
  }, [])

  const handleConfirmMoveNote = useCallback(
    async (nextCategoryId) => {
      if (!pendingMoveNote || moveNoteBusy) return
      setMoveNoteBusy(true)
      try {
        const updated = await updateTextMaterial(pendingMoveNote.id, { categoryId: nextCategoryId })
        if (noteLeavesFolder(activeNavId, updated)) {
          setItems((curr) => curr.filter((r) => r.id !== updated.id))
        } else {
          updateLocalRow(updated)
        }
        if (updated.id === draftId) {
          setCategoryId(nextCategoryId)
          setOriginalSnapshot((s) => ({ ...s, categoryId: nextCategoryId }))
        }
        showToast("success", "Note moved")
        setPendingMoveNote(null)
      } catch (e) {
        showToast("error", e?.message || "Move failed")
      } finally {
        setMoveNoteBusy(false)
      }
    },
    [pendingMoveNote, moveNoteBusy, activeNavId, noteLeavesFolder, updateLocalRow, draftId, showToast],
  )

  const handleExportNote = useCallback(
    (row) => {
      const base =
        (displayNoteTitle(row) || "note")
          .replace(/[^\w\s.-]+/g, "")
          .trim()
          .replace(/\s+/g, "_")
          .slice(0, 80) || "note"
      const blob = new Blob([row.content || ""], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${base}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast("success", "Exported as text file")
    },
    [showToast],
  )

  const handleDuplicate = useCallback(
    async (row) => {
      try {
        const copy = await duplicateTextMaterial(row)
        setItems((curr) => [copy, ...curr])
        loadIntoEditor(copy, { initialMode: "edit" })
        showToast("success", "Note duplicated")
      } catch (e) {
        showToast("error", e?.message || "Duplicate failed")
      }
    },
    [loadIntoEditor, showToast],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete || deleteBusy) return
    const target = pendingDelete
    setDeleteBusy(true)
    try {
      await deleteTextMaterial(target.id)
      setItems((curr) => curr.filter((r) => r.id !== target.id))
      setQuestionCounts((curr) => {
        if (!curr.has(target.id)) return curr
        const next = new Map(curr)
        next.delete(target.id)
        return next
      })
      if (target.id === draftId) {
        setDraftId(null)
        setIsNewDraft(false)
        setTitle("")
        setContent("")
        setCategoryId(null)
        setOriginalSnapshot(DRAFT_DEFAULT)
        setSaveStatus("idle")
      }
      setPendingDelete(null)
      showToast("success", "Note deleted")
    } catch (e) {
      showToast("error", e?.message || "Delete failed")
    } finally {
      setDeleteBusy(false)
    }
  }, [pendingDelete, deleteBusy, draftId, showToast])

  /* ----------------------- Sidebar counts ---------------------------------- */
  const textCountsByCategory = useMemo(() => {
    const m = new Map()
    for (const row of items) {
      const k = row.category_id ?? "__uncat__"
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [items])

  const sidebarCategories = useMemo(() => {
    return categoriesWithCounts.map((c) => ({
      ...c,
      material_count: textCountsByCategory.get(c.id) ?? 0,
    }))
  }, [categoriesWithCounts, textCountsByCategory])

  const totalTextCount = items.length

  const activeTitle = useMemo(() => {
    if (activeNavId === ALL_ID) return "All notes"
    return categoriesWithCounts.find((c) => c.id === activeNavId)?.title || "Notes"
  }, [activeNavId, categoriesWithCounts])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (row) =>
        row.title?.toLowerCase().includes(q) ||
        row.content?.toLowerCase().includes(q) ||
        row.category?.title?.toLowerCase().includes(q),
    )
  }, [items, query])

  /* ----------------------- Render ------------------------------------------ */
  const editorOpen = isNewDraft || draftId !== null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <CategorySidebar
          categories={sidebarCategories}
          activeId={activeNavId}
          onSelect={onSelectNav}
          onCreate={onCreateCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
          loading={categoriesLoading}
          totalCount={totalTextCount}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {!editorOpen ? (
          <section className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#5f4ce6]" />
                <h2 className="truncate text-sm font-semibold text-[#151d3a]">{activeTitle}</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleNew}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5a56e2]"
                >
                  <Plus className="h-4 w-4" />
                  Add Notes
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3c2]" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes"
                    className="h-10 w-full rounded-xl border border-[#e3e6ef] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#6562f1] sm:w-64"
                  />
                </div>
              </div>
            </div>

            {listLoading ? (
              <div className={MATERIALS_WORKSPACE_PANEL_PAD}>
                <SectionSkeleton rows={4} />
              </div>
            ) : !listLoading && items.length === 0 ? (
              <div className={MATERIALS_WORKSPACE_PANEL_EMPTY}>
                <StickyNote className="h-10 w-10 text-[#9aa3c2]" />
                <p className="mt-4 max-w-md text-base font-medium text-[#151d3a]">
                  Your course notes will appear here
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#7d86a5]">
                  Add lecture notes or chapter text above and use them to generate exam questions instantly.
                </p>
              </div>
            ) : (
              <div className={MATERIALS_WORKSPACE_PANEL_PAD}>
                <ContentList
                  embedded
                  fillHeight
                  showHeader={false}
                  emptyHint={
                    filteredItems.length === 0
                      ? "Nothing matched your search. Try different keywords or clear the search box."
                      : ""
                  }
                  loading={false}
                  items={filteredItems}
                  selectedId={draftId}
                  questionCounts={questionCounts}
                  onPreview={handleSelectRow}
                  onEdit={handleEditRow}
                  onNew={handleNew}
                  onMove={handleMoveNote}
                  onDuplicate={handleDuplicate}
                  onExport={handleExportNote}
                  onDelete={setPendingDelete}
                />
              </div>
            )}
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[#596286] transition hover:bg-[#f6f7fc] hover:text-[#151d3a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to notes
            </button>
            <TextEditor
              title={title}
              onTitleChange={setTitle}
              content={content}
              onContentChange={setContent}
              categories={categoriesWithCounts}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              categoryTitle={categoryTitle}
              displayTitle={displayNoteTitle({ title, content, category_id: categoryId })}
              onEdit={() => setMode("edit")}
              onCancel={handleCancelEdit}
              onSave={() => performSave({ openPreviewAfter: true })}
              saving={saving}
              isNewDraft={isNewDraft && !draftId}
              saveStatus={displayedSaveStatus}
              mode={mode}
            />

            {mode === "preview" && draftId ? (
              <Link
                to={`/teacher-dashboard/generate-exam?noteId=${draftId}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#cfc8ff] bg-[#f4f3ff] px-4 py-3 text-sm font-semibold text-[#5f4ce6] transition hover:bg-[#ebe8ff]"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                    Use this note to generate an exam
              </Link>
            ) : null}
          </>
        )}

        
      </div>

      <MoveMaterialDialog
        open={Boolean(pendingMoveNote)}
        material={
          pendingMoveNote
            ? {
                title: displayNoteTitle(pendingMoveNote) || "Untitled note",
                category_id: pendingMoveNote.category_id,
              }
            : null
        }
        categories={categoriesWithCounts}
        busy={moveNoteBusy}
        onConfirm={handleConfirmMoveNote}
        onCancel={() => !moveNoteBusy && setPendingMoveNote(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this note?"
        destructive
        busy={deleteBusy}
        message={
          pendingDelete ? (
            <>
              <p>
                <strong className="text-[#151d3a]">
                  {pendingDelete ? displayNoteTitle(pendingDelete) || "Untitled note" : ""}
                </strong>{" "}
                will
                be removed from your library.
              </p>
              <p className="mt-2 text-xs text-[#7f88a6]">
                Questions you already generated from it will remain in the question bank.
              </p>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete note"
        cancelLabel="Keep"
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleteBusy && setPendingDelete(null)}
      />
    </div>
  )
}

TextStudio.ALL_ID = ALL_ID
TextStudio.UNCAT_ID = CategorySidebar.UNCAT_ID
