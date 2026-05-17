import { useCallback, useEffect, useRef, useState } from "react"
import ContentPicker from "../../components/exam/ContentPicker"
import { fetchCategories } from "../../services/categoryService"
import { fetchQuestionCountsByText, fetchTextMaterials } from "../../services/contentService"
import { displayNoteTitle } from "../../components/materials/noteUtils"
import { buildExamTitleFromNote } from "../../utils/examTitle"

export default function useGenerateExamMaterials(
  noteIdParam,
  { setCfg, setMode, setSelectedMaterialIds, MODE },
) {
  const appliedNoteIdRef = useRef(null)
  const [prefillFromTitle, setPrefillFromTitle] = useState("")
  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(ContentPicker.ALL_ID)
  const [activeMaterial, setActiveMaterial] = useState(null)
  const [questionCounts, setQuestionCounts] = useState(() => new Map())
  const [contentLoading, setContentLoading] = useState(false)

  // ---------- LOAD: categories + content list ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log("[loading] Loading existing educational content...")
        const cats = await fetchCategories()
        if (!cancelled) setCategories(cats)
      } catch (e) {
        console.warn("[warning] Categories fetch failed:", e?.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setContentLoading(true)
      try {
        const opts = {}
        if (activeCategoryId !== ContentPicker.ALL_ID) opts.categoryId = activeCategoryId
        const list = await fetchTextMaterials(opts)
        if (cancelled) return
        setMaterials(list)
        const counts = await fetchQuestionCountsByText(list.map((m) => m.id))
        if (!cancelled) setQuestionCounts(counts)
        console.log("[success] Content loaded successfully", { count: list.length })
      } catch (e) {
        if (!cancelled) {
          console.warn("[warning] Content fetch failed:", e?.message)
          setMaterials([])
        }
      } finally {
        if (!cancelled) setContentLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeCategoryId])

  const onToggleMaterial = useCallback(
    (m) => {
      setSelectedMaterialIds((prev) => {
        const next = new Set(prev)
        if (next.has(m.id)) next.delete(m.id)
        else next.add(m.id)

        if (next.size === 0) {
          setActiveMaterial(null)
        } else if (next.size === 1) {
          const id = [...next][0]
          const material = materials.find((x) => x.id === id) || m
          setActiveMaterial(material)
          const label = displayNoteTitle(material) || material.title?.trim() || "Untitled note"
          console.log("Selected source content:", label)
          setCfg((c) => ({ ...c, title: buildExamTitleFromNote(label) }))
        }

        return next
      })
    },
    [materials, setCfg, setSelectedMaterialIds],
  )

  useEffect(() => {
    if (!noteIdParam || contentLoading) return
    if (appliedNoteIdRef.current === noteIdParam) return
    const note = materials.find((m) => m.id === noteIdParam)
    if (!note) return
    appliedNoteIdRef.current = noteIdParam
    setMode(MODE.SAVED)
    setActiveCategoryId(note.category_id || ContentPicker.ALL_ID)
    setActiveMaterial(note)
    setSelectedMaterialIds(new Set([note.id]))
    const label = displayNoteTitle(note) || note.title?.trim() || "Untitled note"
    setCfg((c) => ({ ...c, title: buildExamTitleFromNote(label) }))
    setPrefillFromTitle(label)
  }, [noteIdParam, materials, contentLoading, setCfg, setMode, setSelectedMaterialIds, MODE])

  return {
    categories,
    materials,
    activeCategoryId,
    setActiveCategoryId,
    activeMaterial,
    setActiveMaterial,
    questionCounts,
    setQuestionCounts,
    contentLoading,
    prefillFromTitle,
    onSelectMaterial: onToggleMaterial,
  }
}
