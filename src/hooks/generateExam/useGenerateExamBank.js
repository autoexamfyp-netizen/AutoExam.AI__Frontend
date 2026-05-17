import { useEffect, useMemo, useState } from "react"
import { fetchQuestionBank } from "../../services/questionService"

export default function useGenerateExamBank(mode, MODE, setError) {
  const [bank, setBank] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [picked, setPicked] = useState(() => new Set())

  // ---------- LOAD: question bank when mode === bank ----------
  useEffect(() => {
    if (mode !== MODE.BANK) return
    let cancelled = false
    ;(async () => {
      setBankLoading(true)
      try {
        const list = await fetchQuestionBank()
        if (!cancelled) setBank(list)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load question bank.")
      } finally {
        if (!cancelled) setBankLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, MODE, setError])

  const togglePick = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedBankQuestions = useMemo(
    () => bank.filter((q) => picked.has(q.id)),
    [bank, picked],
  )

  const selectedBankSummary = useMemo(() => {
    const out = { total: selectedBankQuestions.length, mcq: 0, short: 0, essay: 0, marks: 0 }
    for (const q of selectedBankQuestions) {
      if (q.question_type === "mcq") out.mcq += 1
      else if (q.question_type === "essay") out.essay += 1
      else out.short += 1
      out.marks += Number(q.marks) || 0
    }
    return out
  }, [selectedBankQuestions])

  return {
    bank,
    setBank,
    bankLoading,
    picked,
    setPicked,
    togglePick,
    selectedBankQuestions,
    selectedBankSummary,
  }
}
