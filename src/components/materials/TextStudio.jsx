import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Sparkles, StickyNote } from "lucide-react"
import ContentList from "./ContentList"
import TextEditor from "./TextEditor"
import GeneratePanel from "./GeneratePanel"
import QuestionList from "../questions/QuestionList"
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
import { generateQuestionsFromText } from "../../services/questionService"

const ALL_ID = CategorySidebar.ALL_ID
const UNCAT_ID = CategorySidebar.UNCAT_ID

const DEFAULT_GEN = {
  mcq: 3,
  short: 2,
  essay: 1,
  difficulty: "medium",
  marksMcq: 2,
  marksShort: 4,
  marksEssay: 10,
}

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
 * @param {string} props.activeNavId              Sidebar selection (ALL_ID | UNCAT_ID | category uuid)
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
  const [generating, setGenerating] = useState(false)
  const [genConfig, setGenConfig] = useState(() => ({ ...DEFAULT_GEN }))
  const [generatedPreview, setGeneratedPreview] = useState([])

  const [pendingDelete, setPendingDelete] = useState(null)

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
        else if (activeNavId === UNCAT_ID) rows = await fetchTextMaterials({ uncategorizedOnly: true })
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
  const loadIntoEditor = useCallback((row) => {
    setDraftId(row.id)
    setIsNewDraft(false)
    setTitle(row.title ?? "")
    setContent(row.content ?? "")
    setCategoryId(row.category_id ?? null)
    setOriginalSnapshot({
      id: row.id,
      title: row.title ?? "",
      content: row.content ?? "",
      categoryId: row.category_id ?? null,
    })
    setSaveStatus("idle")
    setMode("edit")
    console.log("📄 Loading content preview...")
    console.log("✏️ Editing content:", row.id)
  }, [])

  const handleSelectRow = (row) => {
    if (row.id === draftId) return
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    loadIntoEditor(row)
  }

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return
    setDraftId(null)
    setIsNewDraft(true)
    setTitle("")
    setContent("")
    if (activeNavId !== ALL_ID && activeNavId !== UNCAT_ID) {
      setCategoryId(activeNavId)
    } else {
      setCategoryId(categoriesWithCounts[0]?.id ?? null)
    }
    setOriginalSnapshot({ id: null, title: "", content: "", categoryId: null })
    setSaveStatus("idle")
    setMode("edit")
    setGeneratedPreview([])
    console.log("📝 Creating new text content...")
  }, [activeNavId, categoriesWithCounts, isDirty])

  /* ----------------------- Save (manual + autosave) ------------------------ */
  const performSave = useCallback(
    async ({ silent = false } = {}) => {
      if (!title.trim() || !content.trim() || !categoryId) {
        if (!silent) showToast("error", "Title, category, and pasted text are required.")
        return null
      }
      setSaving(true)
      setSaveStatus("saving")
      try {
        let row
        if (draftId) {
          console.log("💾 Saving text content...")
          row = await updateTextMaterial(draftId, { title, content, categoryId })
        } else {
          console.log("📝 Creating new text content...")
          console.log("💾 Saving text content...")
          row = await createTextMaterial({ title, content, categoryId })
          setDraftId(row.id)
          setIsNewDraft(false)
          if (!silent) console.log("✅ New content created")
        }
        console.log("✅ Content saved successfully")
        updateLocalRow(row)
        setOriginalSnapshot({
          id: row.id,
          title: row.title ?? "",
          content: row.content ?? "",
          categoryId: row.category_id ?? null,
        })
        flashSaved()
        if (!silent) showToast("success", "Content saved")
        return row
      } catch (e) {
        console.error("❌ Failed to save content:", e)
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
    if (!draftId) return
    if (!isDirty) return
    if (!title.trim() || !content.trim() || !categoryId) return
    autosaveTimerRef.current = window.setTimeout(() => {
      performSave({ silent: true })
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [draftId, isDirty, title, content, categoryId, performSave])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      if (savedFlashTimerRef.current) window.clearTimeout(savedFlashTimerRef.current)
    }
  }, [])

  /* ----------------------- Per-row actions --------------------------------- */
  const handleRename = useCallback(
    async (row) => {
      const next = window.prompt("Rename note", row.title)
      if (next === null || !next.trim() || next.trim() === row.title) return
      try {
        const updated = await updateTextMaterial(row.id, { title: next.trim() })
        updateLocalRow(updated)
        if (updated.id === draftId) {
          setTitle(updated.title)
          setOriginalSnapshot((s) => ({ ...s, title: updated.title }))
        }
        showToast("success", "Renamed")
      } catch (e) {
        showToast("error", e?.message || "Rename failed")
      }
    },
    [draftId, updateLocalRow, showToast],
  )

  const handleDuplicate = useCallback(
    async (row) => {
      try {
        const copy = await duplicateTextMaterial(row)
        setItems((curr) => [copy, ...curr])
        loadIntoEditor(copy)
        showToast("success", "Duplicated")
      } catch (e) {
        showToast("error", e?.message || "Duplicate failed")
      }
    },
    [loadIntoEditor, showToast],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
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
        // Reset editor — load first remaining row, or empty.
        const rest = items.filter((r) => r.id !== target.id)
        if (rest.length) loadIntoEditor(rest[0])
        else {
          setDraftId(null)
          setIsNewDraft(false)
          setTitle("")
          setContent("")
          setCategoryId(null)
          setOriginalSnapshot(DRAFT_DEFAULT)
          setSaveStatus("idle")
        }
      }
      showToast("success", "Note deleted")
    } catch (e) {
      showToast("error", e?.message || "Delete failed")
    }
  }, [pendingDelete, draftId, items, loadIntoEditor, showToast])

  /* ----------------------- Generation -------------------------------------- */
  const handleGenerate = async () => {
    const total = genConfig.mcq + genConfig.short + genConfig.essay
    if (total <= 0) {
      showToast("error", "Choose at least one question to generate.")
      return
    }
    if (!content.trim()) {
      showToast("error", "Paste study content before generating.")
      return
    }
    if (!categoryId) {
      showToast("error", "Pick a category before generating.")
      return
    }

    // Make sure latest text is persisted so question_bank.text_material_id is correct.
    let materialId = draftId
    if (!materialId || isDirty) {
      const saved = await performSave({ silent: true })
      if (!saved) {
        showToast("error", "Save your content first, then generate.")
        return
      }
      materialId = saved.id
    }

    setGenerating(true)
    setGeneratedPreview([])
    try {
      const saved = await generateQuestionsFromText({
        content,
        title: title.trim() || "Study notes",
        categoryTitle: categoryTitle || "General",
        categoryId,
        textMaterialId: materialId,
        config: genConfig,
      })
      setGeneratedPreview(saved)
      setQuestionCounts((curr) => {
        const next = new Map(curr)
        next.set(materialId, (next.get(materialId) ?? 0) + saved.length)
        return next
      })
      showToast("success", `Added ${saved.length} questions to your bank`)
    } catch (e) {
      console.error("❌ Question generation failed:", e)
      showToast("error", e?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

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
  const uncatTextCount = textCountsByCategory.get("__uncat__") ?? 0

  /* ----------------------- Render ------------------------------------------ */
  const editorOpen = isNewDraft || draftId !== null

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-3">
        <CategorySidebar
          categories={sidebarCategories}
          activeId={activeNavId}
          onSelect={onSelectNav}
          onCreate={onCreateCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
          loading={categoriesLoading}
          totalCount={totalTextCount}
          uncategorizedCount={uncatTextCount}
        />
        <ContentList
          loading={listLoading}
          items={items}
          selectedId={draftId}
          questionCounts={questionCounts}
          onSelect={handleSelectRow}
          onNew={handleNew}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={setPendingDelete}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {!editorOpen ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#dbe0ee] bg-white px-4 py-14 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4f3ff] text-[#6562f1]">
              <StickyNote className="h-7 w-7" />
            </div>
            <p className="mt-3 text-base font-semibold text-[#151d3a]">No content open</p>
            <p className="mt-1 max-w-md text-sm text-[#7f88a6]">
              Create a new note or pick one from the list. Saved text is the source of truth for question generation —
              PDFs in the Files tab are storage-only.
            </p>
            <button
              type="button"
              onClick={handleNew}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#6562f1] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5a56e2]"
            >
              <Plus className="h-4 w-4" />
              Create new content
            </button>
          </div>
        ) : (
          <>
            <TextEditor
              title={title}
              onTitleChange={setTitle}
              content={content}
              onContentChange={setContent}
              categories={categoriesWithCounts}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              onSave={() => performSave()}
              saving={saving}
              disabled={generating}
              isNewDraft={isNewDraft && !draftId}
              saveStatus={displayedSaveStatus}
              mode={mode}
              onChangeMode={(next) => {
                setMode(next)
                if (next === "preview") console.log("📚 Preview loaded")
              }}
            />
            <GeneratePanel
              config={genConfig}
              onConfigChange={(patch) => setGenConfig((c) => ({ ...c, ...patch }))}
              onGenerate={handleGenerate}
              generating={generating}
              canGenerate={Boolean(
                content.trim() && categoryId && genConfig.mcq + genConfig.short + genConfig.essay > 0,
              )}
            />

            {generatedPreview.length > 0 ? (
              <div>
                <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#151d3a]">
                  <Sparkles className="h-4 w-4 text-[#6562f1]" /> Just generated
                </h3>
                <QuestionList questions={generatedPreview} emptyMessage="" />
              </div>
            ) : null}
          </>
        )}

        <p className="text-xs text-[#8a93ad]">
          PDF uploads in the Files tab are for storage only. This studio never reads files — question generation always uses
          the text you paste above.
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this content?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed. Questions you already generated from it will remain in the question bank.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

TextStudio.ALL_ID = ALL_ID
TextStudio.UNCAT_ID = UNCAT_ID
