import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Cpu,
  FileText,
  Library,
  Loader2,
  Pencil,
  Plus,
  Save,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import { useTeacherHeader } from "../../components/teacher/TeacherLayout"
import PublishExamModal from "../../components/exam/PublishExamModal"
import { saveQuestionsToBank } from "../../services/questionService"
import { deleteExam } from "../../services/examService"
import ContentPicker from "../../components/exam/ContentPicker"
import FromExistingQuestionsTab from "../../components/exam/FromExistingQuestionsTab"
import ManualQuestionModal from "../../components/questions/ManualQuestionModal"
import { buildExamTitleFromNote, displayExamTitle, sanitizeExamTitleInput } from "../../utils/examTitle"
import { bankTargetMarksBalanceMessage } from "../../utils/examConfig"
import ConfigWeightageSection from "../../components/exam/ConfigWeightageSection"
import ModeTab from "../../components/exam/ModeTab"
import SavedContentPreview from "../../components/exam/SavedContentPreview"
import ConfigPanel from "../../components/exam/ConfigPanel"
import PostGenSourcePanel from "../../components/exam/postGen/PostGenSourcePanel"
import PostGenExamEditor from "../../components/exam/postGen/PostGenExamEditor"
import PostGenActionsPanel from "../../components/exam/postGen/PostGenActionsPanel"
import { buildPercentageMap, validateWeightage } from "../../utils/weightageValidation"
import useGenerateExamMaterials from "../../hooks/generateExam/useGenerateExamMaterials"
import { useCfgMode, useGenerateExamConfigDerived } from "../../hooks/generateExam/useGenerateExamConfig"
import useGenerateExamBank from "../../hooks/generateExam/useGenerateExamBank"
import useGenerateExamPostGen from "../../hooks/generateExam/useGenerateExamPostGen"
import useGenerateExamManual from "../../hooks/generateExam/useGenerateExamManual"
import useGenerateExamGeneration from "../../hooks/generateExam/useGenerateExamGeneration"

const DEFAULTS = {
  title: "",
  description: "",
  durationMinutes: "",
  difficulty: "mixed",
  targetTotalMarks: "",
  targetMcq: "",
  targetShort: "",
  targetEssay: "",
  marksMcq: "",
  marksShort: "",
  marksEssay: "",
}

// Two modes: pick a saved note or compose from the question bank.
const MODE = {
  SAVED: "saved",
  BANK: "bank",
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

/** Only explicit true counts as saved to the reusable bank (undefined/null = exam-only). */
function isQuestionInBank(q) {
  return q?.in_bank === true
}

const TOAST_DURATION_MS = 4000
const WARNING_BANNER_MS = 5000

function WarningBanner({ text, onDone, durationMs = WARNING_BANNER_MS }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const enterId = requestAnimationFrame(() => setEntered(true))
    const doneId = window.setTimeout(() => onDone?.(), durationMs)
    return () => {
      cancelAnimationFrame(enterId)
      window.clearTimeout(doneId)
    }
  }, [durationMs, onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className={classNames(
        "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 transition-all duration-300 ease-out",
        entered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{text}</p>
    </div>
  )
}

function SuccessToast({ text, onDone, durationMs = TOAST_DURATION_MS }) {
  const [entered, setEntered] = useState(false)
  const [barWidth, setBarWidth] = useState(100)

  useEffect(() => {
    const enterId = requestAnimationFrame(() => setEntered(true))
    const shrinkId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarWidth(0))
    })
    const doneId = window.setTimeout(() => onDone?.(), durationMs)
    return () => {
      cancelAnimationFrame(enterId)
      cancelAnimationFrame(shrinkId)
      window.clearTimeout(doneId)
    }
  }, [durationMs, onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className={classNames(
        "fixed left-4 right-4 top-20 z-[130] overflow-hidden rounded-xl border border-[#cdebd9] bg-[#e8fbf3] shadow-lg transition-all duration-300 ease-out sm:left-auto sm:right-6 sm:max-w-md",
        entered ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <p className="px-4 py-3 text-sm font-medium text-[#1f9d67]">{text}</p>
      <div className="h-1 bg-[#cdebd9]">
        <div
          className="h-full bg-[#1f9d67] transition-[width] ease-linear"
          style={{ width: `${barWidth}%`, transitionDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  )
}

export default function TeacherGenerateExamPage() {
  const [searchParams] = useSearchParams()
  const noteIdParam = searchParams.get("noteId")
  const tabParam = searchParams.get("tab")
  const appliedBankTabRef = useRef(false)

  const { cfg, setCfg, mode, setMode } = useCfgMode(MODE)

  useEffect(() => {
    if (tabParam !== "bank" || appliedBankTabRef.current) return
    appliedBankTabRef.current = true
    setMode(MODE.BANK)
    setCfg((c) => ({ ...c, title: "" }))
  }, [tabParam, setCfg, setMode])
  const [generationCfgSnapshot, setGenerationCfgSnapshot] = useState(null)
  const [configSubmitAttempted, setConfigSubmitAttempted] = useState(false)

  const [selectedMaterialIds, setSelectedMaterialIds] = useState(() => new Set())
  const {
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
    onSelectMaterial,
  } = useGenerateExamMaterials(noteIdParam, { setCfg, setMode, setSelectedMaterialIds, MODE })

  const [weightagePercentages, setWeightagePercentages] = useState({})
  const [weightageTouchedPct, setWeightageTouchedPct] = useState(() => new Set())
  const [weightageSubmitAttempted, setWeightageSubmitAttempted] = useState(false)

  const [savingToBank, setSavingToBank] = useState(false)
  const [error, setError] = useState("")
  const {
    bank,
    setBank,
    bankLoading,
    picked,
    setPicked,
    togglePick,
    selectedBankQuestions,
    selectedBankSummary,
  } = useGenerateExamBank(mode, MODE, setError)
  const [toast, setToast] = useState(null)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [publishPreparing, setPublishPreparing] = useState(false)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const [backActionBusy, setBackActionBusy] = useState(false)
  const { setHeaderBreadcrumb } = useTeacherHeader() || {}

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
  }, [])

  const deleteTargetRef = useRef(() => {})
  const postGenBridgeRef = useRef({
    last: null,
    setLast: () => {},
    postGenQuestions: [],
    postGenMultiSource: null,
  })

  const manual = useGenerateExamManual({
    mode,
    activeMaterial,
    categories,
    last: postGenBridgeRef.current.last,
    setLast: (...args) => postGenBridgeRef.current.setLast(...args),
    bank,
    setBank,
    picked,
    setPicked,
    postGenQuestions: postGenBridgeRef.current.postGenQuestions,
    setError,
    setDeleteQuestionTarget: (t) => deleteTargetRef.current(t),
    MODE,
    postGenMultiSource: postGenBridgeRef.current.postGenMultiSource,
  })

  const postGen = useGenerateExamPostGen({
    cfg,
    setCfg,
    mode,
    activeMaterial,
    MODE,
    generationCfgSnapshot,
    setGenerationCfgSnapshot,
    setError,
    setBank,
    setPicked,
    manualModal: manual.manualModal,
    resetManualModal: manual.resetManualModal,
    manualFormFromQuestion: manual.manualFormFromQuestion,
    setQuestionCounts,
    showToast,
  })

  deleteTargetRef.current = postGen.setDeleteQuestionTarget
  postGenBridgeRef.current = {
    last: postGen.last,
    setLast: postGen.setLast,
    postGenQuestions: postGen.postGenQuestions,
    postGenMultiSource: postGen.postGenMultiSource,
  }

  const {
    last,
    inPostGeneration,
    centerFadeIn,
    settingsOpen,
    setSettingsOpen,
    examSettingsForm,
    setExamSettingsForm,
    examSettingsSaving,
    publishOpen,
    setPublishOpen,
    draftSaving,
    deleteQuestionTarget,
    setDeleteQuestionTarget,
    deletingQuestion,
    inlineEditId,
    inlineEditForm,
    setInlineEditForm,
    inlineEditSaving,
    postGenQuestions,
    postGenBreakdown,
    postGenDifficultyLabel,
    postGenDisplayTitle,
    postGenDurationMinutes,
    postGenIsMultiSource,
    postGenMultiSource,
    postGenMarksStatus,
    sourceSummary,
    onChangePostGenContent,
    onSaveExamSettings,
    onSaveDraft,
    onConfirmDeleteQuestion,
    startInlineEdit,
    cancelInlineEdit,
    saveInlineEdit,
    ensureExamQuestionsInBank,
    applyBankSaveToState,
    refreshMaterialQuestionCounts,
  } = postGen

  const {
    manualModal,
    manualForm,
    manualSaving,
    openAddManualQuestion,
    openEditGeneratedQuestion,
    requestDeleteQuestion,
    closeManualModal,
    submitManualQuestion,
    setManualForm,
  } = manual

  useEffect(() => {
    if (!setHeaderBreadcrumb) return undefined
    if (inPostGeneration) {
      setHeaderBreadcrumb(["Generate Exam", "Review Exam"])
    } else {
      setHeaderBreadcrumb(null)
    }
    return () => setHeaderBreadcrumb(null)
  }, [inPostGeneration, setHeaderBreadcrumb])

  const selectedMaterials = useMemo(
    () => materials.filter((m) => selectedMaterialIds.has(m.id)),
    [materials, selectedMaterialIds],
  )

  const selectedMaterialKey = useMemo(
    () => selectedMaterials.map((m) => m.id).sort().join(","),
    [selectedMaterials],
  )

  useEffect(() => {
    if (selectedMaterials.length < 2) {
      setWeightageSubmitAttempted(false)
      return
    }
    setWeightagePercentages(buildPercentageMap(selectedMaterials))
    setWeightageTouchedPct(new Set())
    setWeightageSubmitAttempted(false)
  }, [selectedMaterialKey, selectedMaterials])

  const weightageValidation = useMemo(
    () =>
      validateWeightage({
        materials: selectedMaterials,
        percentages: weightagePercentages,
        submitAttempted: weightageSubmitAttempted,
        touchedPctIds: weightageTouchedPct,
      }),
    [
      selectedMaterials,
      weightagePercentages,
      weightageSubmitAttempted,
      weightageTouchedPct,
    ],
  )

  const needsWeightageValidation = mode === MODE.SAVED && selectedMaterialIds.size >= 2

  const { totals, configValidation, canGenerateExam } = useGenerateExamConfigDerived({
    cfg,
    mode,
    activeMaterial,
    picked,
    bankSelectedMarks: selectedBankSummary.marks,
    MODE,
    needsWeightageValidation,
    weightageValidation,
  })

  const touchWeightagePct = useCallback((id) => {
    setWeightageTouchedPct((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const {
    generating,
    generateProgressLabel,
    generationWarning,
    setGenerationWarning,
    onGenerateExam,
  } = useGenerateExamGeneration({
    cfg,
    mode,
    activeMaterial,
    picked,
    selectedBankQuestions,
    configValidation,
    selectedMaterials,
    weightagePercentages,
    weightageTouchedPct,
    setWeightageSubmitAttempted,
    setConfigSubmitAttempted,
    setGenerationCfgSnapshot,
    setLast: postGen.setLast,
    setError,
    MODE,
  })

  const generateDisabledTooltip = useMemo(() => {
    if (canGenerateExam || generating) return undefined
    if (needsWeightageValidation && weightageValidation.tooltip) {
      return weightageValidation.tooltip
    }
    if (mode === MODE.BANK) {
      if (picked.size === 0) return "Select at least one question to compile"
      if (!configValidation.title.valid) return configValidation.title.error || "Enter an exam title"
      if (!configValidation.duration.valid) {
        return configValidation.duration.error || "Exam duration must be at least 10 minutes."
      }
      const marksMsg = bankTargetMarksBalanceMessage(
        selectedBankSummary.marks,
        cfg.targetTotalMarks,
      )
      if (marksMsg) return marksMsg
    }
    return "Fill in all required fields to generate"
  }, [
    canGenerateExam,
    generating,
    needsWeightageValidation,
    weightageValidation.tooltip,
    mode,
    picked.size,
    configValidation.title,
    configValidation.duration,
    cfg.targetTotalMarks,
    selectedBankSummary.marks,
  ])

  const onDiscardExamAndLeaveReview = async () => {
    if (!last?.exam?.id || backActionBusy) return
    setBackActionBusy(true)
    setError("")
    try {
      await deleteExam(last.exam.id)
      setBackConfirmOpen(false)
      onChangePostGenContent()
    } catch (e) {
      setError(e?.message || "Could not discard this exam.")
    } finally {
      setBackActionBusy(false)
    }
  }

  const onPublishClick = async () => {
    if (!postGenQuestions.length || publishPreparing) return
    setPublishPreparing(true)
    setError("")
    try {
      await ensureExamQuestionsInBank()
      setPublishConfirmOpen(true)
    } catch (e) {
      setError(e?.message || "Could not save questions to the bank.")
    } finally {
      setPublishPreparing(false)
    }
  }

  const onSaveExamQuestionsToBank = async () => {
    if (savingToBank || !postGenQuestions.length) return
    const ids = postGenQuestions.map((q) => q.id).filter(Boolean)
    if (!ids.length) return
    setSavingToBank(true)
    setError("")
    try {
      const saved = await saveQuestionsToBank(ids)
      if (saved.length) {
        applyBankSaveToState(saved)
      } else {
        postGen.setLast((prev) => {
          if (!prev?.questions?.length) return prev
          const idSet = new Set(ids)
          return {
            ...prev,
            questions: prev.questions.map((q) =>
              idSet.has(q.id) ? { ...q, in_bank: true } : q,
            ),
          }
        })
      }
      await refreshMaterialQuestionCounts()
      showToast("All questions saved to your question bank.")
    } catch (e) {
      setError(e?.message || "Could not save questions to the bank.")
    } finally {
      setSavingToBank(false)
    }
  }

  const onExamPublished = () => {
    setPublishOpen(false)
    showToast("Exam published successfully. Students can now attempt it.")
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Generate exam</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            Pick your course material, set your question breakdown, and let the AI build the exam.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <ModeTab
          active={mode === MODE.SAVED}
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode(MODE.SAVED)
            setCfg((c) => ({ ...c, title: "" }))
          }}
        >
          Saved content
        </ModeTab>
        <ModeTab
          active={mode === MODE.BANK}
          icon={<Library className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode(MODE.BANK)
            setCfg((c) => ({ ...c, title: "" }))
          }}
        >
          From existing questions
        </ModeTab>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      ) : null}

      {toast ? (
        <SuccessToast key={toast.key} text={toast.text} onDone={() => setToast(null)} />
      ) : null}

      {inPostGeneration && generationWarning ? (
        <WarningBanner
          key={generationWarning}
          text={generationWarning}
          onDone={() => setGenerationWarning(null)}
        />
      ) : null}

      {inPostGeneration ? (
        <>
        <button
          type="button"
          onClick={() => setBackConfirmOpen(true)}
          className="text-left text-sm font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
        >
          {"<- Back to Generate Exam"}
        </button>
        <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
          <PostGenSourcePanel
            summary={sourceSummary}
            isMultiSource={postGenIsMultiSource}
            multiSource={postGenMultiSource}
            marksStatus={postGenMarksStatus}
            onChangeContent={onChangePostGenContent}
          />
          <div
            className={classNames(
              "min-h-[640px] transition-opacity duration-300",
              centerFadeIn ? "opacity-100" : "opacity-0",
            )}
          >
            <PostGenExamEditor
              exam={last.exam}
              questions={postGenQuestions}
              isMultiSource={postGenIsMultiSource}
              multiSource={postGenMultiSource}
              displayTitle={postGenDisplayTitle}
              durationMinutes={postGenDurationMinutes}
              difficultyLabel={postGenDifficultyLabel}
              configBreakdown={postGenBreakdown}
              inlineEditId={inlineEditId}
              inlineEditForm={inlineEditForm}
              inlineEditSaving={inlineEditSaving}
              onStartInlineEdit={startInlineEdit}
              onCancelInlineEdit={cancelInlineEdit}
              onChangeInlineEdit={setInlineEditForm}
              onSaveInlineEdit={saveInlineEdit}
              onDeleteQuestion={(q) => requestDeleteQuestion(q, "exam")}
              onAddQuestion={() => openAddManualQuestion()}
            />
          </div>
          <PostGenActionsPanel
            exam={last.exam}
            questions={postGenQuestions}
            isMultiSource={postGenIsMultiSource}
            multiSource={postGenMultiSource}
            breakdown={postGenBreakdown}
            displayTitle={postGenDisplayTitle}
            durationMinutes={postGenDurationMinutes}
            difficultyLabel={postGenDifficultyLabel}
            draftSaving={draftSaving}
            settingsOpen={settingsOpen}
            settingsForm={examSettingsForm}
            settingsSaving={examSettingsSaving}
            onToggleSettings={() => {
              setSettingsOpen((v) => !v)
              if (!settingsOpen && last?.exam) {
                setExamSettingsForm({
                  title: last.exam.title || "",
                  duration_minutes: last.exam.duration_minutes || 60,
                  description: last.exam.description || "",
                })
              }
            }}
            onChangeSettings={setExamSettingsForm}
            onSaveSettings={onSaveExamSettings}
            onCancelSettings={() => setSettingsOpen(false)}
            onPublish={onPublishClick}
            publishPreparing={publishPreparing}
            onSaveDraft={onSaveDraft}
            onSaveToBank={onSaveExamQuestionsToBank}
            savingToBank={savingToBank}
            allInBank={
              postGenQuestions.length > 0 && postGenQuestions.every(isQuestionInBank)
            }
            marksStatus={postGenMarksStatus}
          />
        </div>
        </>
      ) : mode === MODE.BANK ? (
        <FromExistingQuestionsTab
          bank={bank}
          bankLoading={bankLoading}
          setBank={setBank}
          categories={categories}
          picked={picked}
          setPicked={setPicked}
          cfg={cfg}
          setCfg={setCfg}
          validation={configValidation}
          configSubmitAttempted={configSubmitAttempted}
          canCompile={canGenerateExam}
          compileDisabledTooltip={generateDisabledTooltip}
          compiling={generating}
          onCompile={onGenerateExam}
          onOpenAddManual={openAddManualQuestion}
          onEditQuestion={openEditGeneratedQuestion}
          onDeleteQuestion={(q) => requestDeleteQuestion(q, "bank")}
          setError={setError}
        />
      ) : (
      <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <div className="h-[640px]">
            <ContentPicker
              categories={categories}
              materials={materials}
              activeCategoryId={activeCategoryId}
              onChangeCategory={setActiveCategoryId}
              selectedMaterialIds={selectedMaterialIds}
              onToggleMaterial={onSelectMaterial}
              questionCounts={questionCounts}
              loading={contentLoading}
              prefillFromTitle={prefillFromTitle}
            />
          </div>
        </div>

        <div className="min-h-[640px] xl:col-span-5">
          <SavedContentPreview
            material={activeMaterial}
            questionCount={activeMaterial ? questionCounts.get(activeMaterial.id) || 0 : 0}
          />
        </div>

        {/* RIGHT: AI config + buttons + generated summary */}
        <div className="space-y-4 xl:col-span-4">
          <ConfigPanel
            cfg={cfg}
            onChange={setCfg}
            totals={totals}
            validation={configValidation}
            canGenerateExam={canGenerateExam}
            generating={generating}
            mode={mode}
            configSubmitAttempted={configSubmitAttempted}
            onGenerateExam={onGenerateExam}
            picked={picked}
            selectedBankSummary={selectedBankSummary}
            generateDisabledTooltip={generateDisabledTooltip}
            generateProgressLabel={generateProgressLabel}
            multiSourceWeightage={
              needsWeightageValidation
                ? {
                    materials: selectedMaterials,
                    percentages: weightagePercentages,
                    onPercentagesChange: setWeightagePercentages,
                    submitAttempted: weightageSubmitAttempted,
                    touchedPctIds: weightageTouchedPct,
                    onTouchPct: touchWeightagePct,
                  }
                : null
            }
          />
        </div>
      </div>
      )}

      <ConfirmDialog
        open={backConfirmOpen}
        title="Discard this exam?"
        destructive
        busy={backActionBusy}
        message={
          <p>
            This will delete the exam and return you to setup. Questions already saved to your
            question bank will stay there.
          </p>
        }
        cancelLabel="Stay on this page"
        confirmLabel="Discard exam"
        onConfirm={onDiscardExamAndLeaveReview}
        onCancel={() => setBackConfirmOpen(false)}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        title="Publish this exam?"
        message={
          <p>
            Once published, students assigned to this exam will be able to see and attempt it. You
            can unpublish it later from My Exams.
          </p>
        }
        confirmLabel="Publish now"
        cancelLabel="Cancel"
        onConfirm={() => {
          setPublishConfirmOpen(false)
          setPublishOpen(true)
        }}
        onCancel={() => setPublishConfirmOpen(false)}
      />

      {last?.exam ? (
        <PublishExamModal
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          examTemplate={{
            id: last.exam.id,
            title: last.exam.title,
            category_id: last.exam.category_id,
            duration_minutes: last.exam.duration_minutes,
            total_questions: last.exam.total_questions ?? postGenQuestions.length,
            total_marks: last.exam.total_marks,
          }}
          onPublished={onExamPublished}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteQuestionTarget)}
        title="Remove this question?"
        destructive
        busy={deletingQuestion}
        message={
          deleteQuestionTarget ? (
            <p>
              {deleteQuestionTarget.scope === "exam" ? (
                <>
                  <strong className="text-[#151d3a]">
                    Q
                    {postGenQuestions.findIndex((q) => q.id === deleteQuestionTarget.question.id) + 1}
                  </strong>{" "}
                  will be removed from this exam and deleted from your question bank.
                </>
              ) : (
                <>
                  This question will be permanently deleted from your question bank
                  {picked.has(deleteQuestionTarget.question.id)
                    ? " and removed from your current selection."
                    : "."}
                </>
              )}
            </p>
          ) : null
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteQuestion}
        onCancel={() => !deletingQuestion && setDeleteQuestionTarget(null)}
      />

      <ManualQuestionModal
        open={Boolean(manualModal && manualForm)}
        isEdit={manualModal?.mode === "edit"}
        form={manualForm}
        categories={categories}
        sourceOptions={
          postGenIsMultiSource && manualModal?.mode === "add"
            ? postGenMultiSource?.sourceTitles ?? []
            : null
        }
        saving={manualSaving}
        onChange={setManualForm}
        onSubmit={submitManualQuestion}
        onClose={closeManualModal}
      />
    </div>
  )
}

// =============================================================================
// Subcomponents
// =============================================================================

function SidePanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 text-xs text-[#5d6580] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">{title}</p>
      <div className="mt-2 space-y-1 leading-relaxed">{children}</div>
    </div>
  )
}



