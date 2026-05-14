import QuestionCard from "./QuestionCard"

/**
 * @param {object} props
 * @param {object[]} props.questions
 * @param {string} [props.emptyMessage]
 * @param {(q: object) => void} [props.onEdit]
 * @param {(q: object) => void} [props.onDelete]
 * @param {Set<string>} [props.selectedIds]
 * @param {(q: object) => void} [props.onToggleSelect]
 */
export default function QuestionList({
  questions,
  emptyMessage,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
}) {
  if (!questions.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#dbe0ee] bg-white px-4 py-8 text-center text-sm text-[#7f88a6]">
        {emptyMessage || "No questions yet."}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={index + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          selected={selectedIds?.has(q.id) || false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}
