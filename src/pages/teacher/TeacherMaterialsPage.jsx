import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertCircle, FileStack, FolderOpen, Menu, Plus, Search, UploadCloud, X } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import RenameDialog from "../../components/ui/RenameDialog"
import MoveMaterialDialog from "../../components/ui/MoveMaterialDialog"
import FileUpload from "../../components/materials/FileUpload"
import MaterialCard from "../../components/materials/MaterialCard"
import MaterialPreviewModal from "../../components/materials/MaterialPreviewModal"
import CategorySidebar from "../../components/materials/CategorySidebar"
import TextStudio from "../../components/materials/TextStudio"
import CreateCategoryModal from "../../components/materials/CreateCategoryModal"
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../../services/categoryService"
import {
  deleteMaterial,
  fetchMaterials,
  moveMaterial,
  renameMaterial,
} from "../../services/materialService"

const LIBRARY_TYPES = new Set(["pdf", "ppt"])

const ALL_ID = CategorySidebar.ALL_ID
const UNCAT_ID = CategorySidebar.UNCAT_ID

export default function TeacherMaterialsPage() {
  const [searchParams] = useSearchParams()
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [materialsLoading, setMaterialsLoading] = useState(true)
  const [categoryError, setCategoryError] = useState("")
  const [materialsError, setMaterialsError] = useState("")

  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [activeId, setActiveId] = useState(ALL_ID)
  const [uploadCategoryId, setUploadCategoryId] = useState(null)

  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")

  const [preview, setPreview] = useState(null)
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState(null)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null)
  const [pendingRenameMaterial, setPendingRenameMaterial] = useState(null)
  const [pendingMoveMaterial, setPendingMoveMaterial] = useState(null)
  const [renameBusy, setRenameBusy] = useState(false)
  const [moveBusy, setMoveBusy] = useState(false)
  const [deleteMaterialBusy, setDeleteMaterialBusy] = useState(false)
  const [deleteCategoryBusy, setDeleteCategoryBusy] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const [toast, setToast] = useState(null)
  const [workspaceTab, setWorkspaceTab] = useState("files") // "files" | "text"

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "text" || tab === "notes") setWorkspaceTab("text")
  }, [searchParams])

  const showToast = useCallback((tone, text) => {
    setToast({ tone, text, key: Date.now() })
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const rows = await fetchCategories()
      setCategories(rows)
      setUploadCategoryId((curr) => {
        if (curr && rows.some((r) => r.id === curr)) return curr
        return rows[0]?.id ?? null
      })
      setCategoryError("")
      return rows
    } catch (e) {
      setCategoryError(e?.message || "Could not load categories.")
      return []
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const loadMaterials = useCallback(async () => {
    try {
      const rows = await fetchMaterials()
      setMaterials(rows)
      setMaterialsError("")
    } catch (e) {
      setMaterialsError(e?.message || "Could not load materials.")
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [cats, mats] = await Promise.allSettled([fetchCategories(), fetchMaterials()])
      if (cancelled) return

      if (cats.status === "fulfilled") {
        setCategories(cats.value)
        setUploadCategoryId(cats.value[0]?.id ?? null)
      } else {
        setCategoryError(cats.reason?.message || "Could not load categories.")
      }
      setCategoriesLoading(false)

      if (mats.status === "fulfilled") {
        setMaterials(mats.value)
      } else {
        setMaterialsError(mats.reason?.message || "Could not load materials.")
      }
      setMaterialsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const libraryMaterials = useMemo(
    () => materials.filter((m) => LIBRARY_TYPES.has(m.material_type)),
    [materials],
  )

  const totalCount = libraryMaterials.length
  const uncategorizedCount = useMemo(
    () => libraryMaterials.filter((m) => !m.category_id).length,
    [libraryMaterials],
  )

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map()
    for (const m of libraryMaterials) {
      if (!m.category_id) continue
      counts.set(m.category_id, (counts.get(m.category_id) ?? 0) + 1)
    }
    return categories.map((c) => ({
      ...c,
      material_count: counts.get(c.id) ?? c.material_count ?? 0,
    }))
  }, [categories, libraryMaterials])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return libraryMaterials.filter((m) => {
      if (activeId === UNCAT_ID && m.category_id) return false
      if (activeId !== ALL_ID && activeId !== UNCAT_ID && m.category_id !== activeId) return false
      if (filter !== "all" && m.material_type !== filter) return false
      if (!q) return true
      return (
        m.title?.toLowerCase().includes(q) ||
        m.original_filename?.toLowerCase().includes(q) ||
        m.public_id?.toLowerCase().includes(q) ||
        m.category?.title?.toLowerCase().includes(q)
      )
    })
  }, [libraryMaterials, activeId, filter, query])

  useEffect(() => {
    if (activeId === ALL_ID || activeId === UNCAT_ID) {
      console.log("🔍 Filtering materials by category:", activeId)
    } else {
      const c = categories.find((x) => x.id === activeId)
      console.log("🔍 Filtering materials by category:", c?.title || activeId)
    }
    console.log("✅ Materials filtered successfully:", filtered.length)
  }, [activeId, filtered.length, categories])

  const onUploaded = useCallback(
    (saved) => {
      setMaterials((curr) => [saved, ...curr])
      showToast("success", `${saved.title} uploaded`)
    },
    [showToast],
  )

  const onSelectCategory = (id) => {
    setActiveId(id)
    setDrawerOpen(false)
    if (id !== ALL_ID && id !== UNCAT_ID) setUploadCategoryId(id)
  }

  const openUploadModal = useCallback(() => {
    if (activeId !== ALL_ID && activeId !== UNCAT_ID) {
      setUploadCategoryId(activeId)
    } else {
      setUploadCategoryId(null)
    }
    setUploadOpen(true)
  }, [activeId])

  const onRename = useCallback((material) => {
    setPendingRenameMaterial(material)
  }, [])

  const onMove = useCallback((material) => {
    setPendingMoveMaterial(material)
  }, [])

  const onConfirmMoveMaterial = useCallback(
    async (categoryId) => {
      if (!pendingMoveMaterial || moveBusy) return
      setMoveBusy(true)
      try {
        const updated = await moveMaterial(pendingMoveMaterial.id, categoryId)
        setMaterials((curr) => curr.map((m) => (m.id === updated.id ? updated : m)))
        showToast("success", "Material moved")
        setPendingMoveMaterial(null)
      } catch (e) {
        showToast("error", e?.message || "Move failed")
      } finally {
        setMoveBusy(false)
      }
    },
    [pendingMoveMaterial, moveBusy, showToast],
  )

  const onConfirmRenameMaterial = useCallback(
    async (nextTitle) => {
      if (!pendingRenameMaterial) return
      setRenameBusy(true)
      try {
        const updated = await renameMaterial(pendingRenameMaterial.id, nextTitle)
        setMaterials((curr) => curr.map((m) => (m.id === updated.id ? updated : m)))
        showToast("success", "Material renamed")
        setPendingRenameMaterial(null)
      } catch (e) {
        showToast("error", e?.message || "Rename failed")
        throw e
      } finally {
        setRenameBusy(false)
      }
    },
    [pendingRenameMaterial, showToast],
  )

  const onConfirmDeleteMaterial = useCallback(async () => {
    if (!pendingDeleteMaterial || deleteMaterialBusy) return
    const target = pendingDeleteMaterial
    setDeleteMaterialBusy(true)
    try {
      await deleteMaterial(target.id)
      setMaterials((curr) => curr.filter((m) => m.id !== target.id))
      setPendingDeleteMaterial(null)
      showToast("success", "Material deleted")
    } catch (e) {
      showToast("error", e?.message || "Delete failed")
    } finally {
      setDeleteMaterialBusy(false)
    }
  }, [pendingDeleteMaterial, deleteMaterialBusy, showToast])

  const onSubmitCategory = useCallback(
    async ({ title, description }) => {
      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, { title, description })
        setCategories((curr) =>
          curr.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        )
        showToast("success", "Category updated")
      } else {
        const created = await createCategory({ title, description })
        setCategories((curr) => [...curr, created].sort((a, b) => a.title.localeCompare(b.title)))
        setUploadCategoryId(created.id)
        setActiveId(created.id)
        showToast("success", "Category created")
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
    },
    [editingCategory, showToast],
  )

  const onConfirmDeleteCategory = useCallback(async () => {
    if (!pendingDeleteCategory || deleteCategoryBusy) return
    const target = pendingDeleteCategory
    setDeleteCategoryBusy(true)
    try {
      await deleteCategory(target.id)
      setCategories((curr) => curr.filter((c) => c.id !== target.id))
      setMaterials((curr) =>
        curr.map((m) =>
          m.category_id === target.id ? { ...m, category_id: null, category: null } : m,
        ),
      )
      if (activeId === target.id) setActiveId(ALL_ID)
      if (uploadCategoryId === target.id) setUploadCategoryId(null)
      setPendingDeleteCategory(null)
      showToast("success", "Subject deleted")
    } catch (e) {
      showToast("error", e?.message || "Delete failed")
    } finally {
      setDeleteCategoryBusy(false)
    }
  }, [pendingDeleteCategory, deleteCategoryBusy, activeId, uploadCategoryId, showToast])

  const activeTitle =
    activeId === ALL_ID
      ? "All materials"
      : activeId === UNCAT_ID
        ? "Uncategorized"
        : categoriesWithCounts.find((c) => c.id === activeId)?.title || "Materials"

  const sidebar = (
    <CategorySidebar
      categories={categoriesWithCounts}
      activeId={activeId}
      onSelect={onSelectCategory}
      onCreate={() => {
        setEditingCategory(null)
        setShowCategoryModal(true)
      }}
      onEdit={(c) => {
        setEditingCategory(c)
        setShowCategoryModal(true)
      }}
      onDelete={setPendingDeleteCategory}
      loading={categoriesLoading}
      totalCount={totalCount}
      uncategorizedCount={uncategorizedCount}
    />
  )

  const retryLoad = useCallback(() => {
    setMaterialsLoading(true)
    setCategoriesLoading(true)
    loadCategories()
    loadMaterials()
  }, [loadCategories, loadMaterials])

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          {workspaceTab === "files" ? (
          <button
            type="button"
            className="rounded-xl border border-[#e8ebf4] bg-white p-2 text-[#596286] lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open subjects"
          >
            <Menu className="h-5 w-5" />
          </button>
          ) : null}
          <div>
            <p className="text-sm text-[#5d6580] sm:text-[15px]">
              Upload course content to power your AI exam generation.
            </p>
            <div className="mt-3 inline-flex rounded-xl border border-[#e7eaf3] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setWorkspaceTab("files")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  workspaceTab === "files" ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#596286] hover:bg-[#fafbff]"
                }`}
              >
                Files & Uploads
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("text")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  workspaceTab === "text" ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#596286] hover:bg-[#fafbff]"
                }`}
              >
                <FileStack className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Course Notes
              </button>
            </div>
          </div>
        </div>
        {toast ? (
          <div
            key={toast.key}
            role="status"
            className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
              toast.tone === "success"
                ? "border-[#cdebd9] bg-[#e8fbf3] text-[#1f9d67]"
                : "border-[#fbd8d8] bg-[#fdecec] text-[#c94a4a]"
            }`}
          >
            {toast.text}
          </div>
        ) : null}
      </div>

      {categoryError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{categoryError}</div>
          <button
            type="button"
            onClick={retryLoad}
            className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      {workspaceTab === "files" ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="hidden lg:block">{sidebar}</div>

            <div className="min-w-0 space-y-4">
          <section className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#5f4ce6]" />
                <h2 className="truncate text-sm font-semibold text-[#151d3a]">{activeTitle}</h2>
                <span className="rounded-full bg-[#f1f3f8] px-2 text-[11px] font-semibold text-[#5d6580]">
                  {filtered.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={openUploadModal}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5a56e2]"
                >
                  <Plus className="h-4 w-4" />
                  Add materials
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3c2]" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search materials"
                    className="h-10 w-full rounded-xl border border-[#e3e6ef] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#6562f1] sm:w-64"
                  />
                </div>
                <div className="inline-flex rounded-xl border border-[#e3e6ef] bg-white p-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "pdf", label: "PDFs" },
                    { id: "ppt", label: "Slides (PPT)" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFilter(opt.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        filter === opt.id ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#596286] hover:bg-[#fafbff]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {materialsError ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">{materialsError}</div>
                <button
                  type="button"
                  onClick={retryLoad}
                  className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {materialsLoading ? (
              <SectionSkeleton rows={4} />
            ) : filtered.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center">
                <UploadCloud className="h-10 w-10 text-[#9aa3c2]" />
                <p className="mt-3 text-sm font-semibold text-[#151d3a]">
                  {activeId === ALL_ID
                    ? "No materials yet"
                    : `No materials in "${activeTitle}" yet`}
                </p>
                <p className="mt-1 text-xs text-[#7f88a6]">
                  Upload PDFs or PowerPoint slides for your subject folders.
                </p>
                <button
                  type="button"
                  onClick={openUploadModal}
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#5a56e2]"
                >
                  <Plus className="h-4 w-4" />
                  Add materials
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((m) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    onPreview={setPreview}
                    onRename={onRename}
                    onMove={onMove}
                    onDelete={setPendingDeleteMaterial}
                  />
                ))}
              </div>
            )}
          </section>
            </div>
          </div>

          {drawerOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
              <button
                type="button"
                aria-label="Close subjects"
                onClick={() => setDrawerOpen(false)}
                className="absolute inset-0 bg-[#0f1730]/40 backdrop-blur-[2px]"
              />
              <div className="absolute left-0 top-0 h-full w-[min(320px,88vw)] overflow-y-auto bg-[#f3f5fb] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#151d3a]">Subjects</span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-2 text-[#596286] hover:bg-white"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {sidebar}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <TextStudio
          categoriesWithCounts={categoriesWithCounts}
          categoriesLoading={categoriesLoading}
          activeNavId={activeId}
          onSelectNav={onSelectCategory}
          onCreateCategory={() => {
            setEditingCategory(null)
            setShowCategoryModal(true)
          }}
          onEditCategory={(c) => {
            setEditingCategory(c)
            setShowCategoryModal(true)
          }}
          onDeleteCategory={setPendingDeleteCategory}
          showToast={showToast}
        />
      )}

      <MaterialPreviewModal material={preview} onClose={() => setPreview(null)} />

      <FileUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={onUploaded}
        categories={categoriesWithCounts}
        selectedCategoryId={uploadCategoryId}
        onChangeCategory={setUploadCategoryId}
      />

      <CreateCategoryModal
        open={showCategoryModal}
        initial={editingCategory}
        onSubmit={onSubmitCategory}
        onClose={() => {
          setShowCategoryModal(false)
          setEditingCategory(null)
        }}
      />

      <MoveMaterialDialog
        open={Boolean(pendingMoveMaterial)}
        material={pendingMoveMaterial}
        categories={categoriesWithCounts}
        busy={moveBusy}
        onConfirm={onConfirmMoveMaterial}
        onCancel={() => !moveBusy && setPendingMoveMaterial(null)}
      />

      <RenameDialog
        open={Boolean(pendingRenameMaterial)}
        title="Rename material"
        label="Material name"
        helper={
          pendingRenameMaterial?.category?.title
            ? `In subject "${pendingRenameMaterial.category.title}".`
            : "Give this material a clear, searchable name."
        }
        initialValue={pendingRenameMaterial?.title || ""}
        confirmLabel="Save name"
        onConfirm={onConfirmRenameMaterial}
        onCancel={() => !renameBusy && setPendingRenameMaterial(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteMaterial)}
        title="Delete material?"
        destructive
        busy={deleteMaterialBusy}
        message={
          pendingDeleteMaterial ? (
            <>
              <p>
                <strong className="text-[#151d3a]">{pendingDeleteMaterial.title}</strong> will be
                permanently removed from your library
                {pendingDeleteMaterial.category?.title
                  ? ` in "${pendingDeleteMaterial.category.title}"`
                  : ""}
                .
              </p>
              <p className="mt-2 text-xs text-[#7f88a6]">
                The underlying file may still exist in Cloudinary until server-side cleanup is wired.
              </p>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete material"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteMaterial}
        onCancel={() => !deleteMaterialBusy && setPendingDeleteMaterial(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteCategory)}
        title="Delete subject?"
        destructive
        busy={deleteCategoryBusy}
        message={
          pendingDeleteCategory ? (
            <>
              <p>
                <strong className="text-[#151d3a]">{pendingDeleteCategory.title}</strong> will be
                removed from your subjects.
              </p>
              <p className="mt-2 text-xs text-[#7f88a6]">
                {pendingDeleteCategory.material_count > 0
                  ? `${pendingDeleteCategory.material_count} material${
                      pendingDeleteCategory.material_count === 1 ? "" : "s"
                    } inside will become uncategorized — they aren't deleted.`
                  : "No materials are linked to this subject."}
              </p>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete subject"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteCategory}
        onCancel={() => !deleteCategoryBusy && setPendingDeleteCategory(null)}
      />
    </div>
  )
}
