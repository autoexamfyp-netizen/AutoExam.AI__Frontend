import QuestionCard from "./QuestionCard"

/**
 * @param {object} props
 * @param {object[]} props.questions
 * @param {string} [props.emptyMessage]
 * @param {(q: object) => void} [props.onEdit]
 * @param {(q: object) => void} [props.onDelete]
 * @param {(q: object) => void} [props.onToggleFavorite]
 */
export default function QuestionList({ questions, emptyMessage, onEdit, onDelete, onToggleFavorite }) {
  if (!questions.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#dbe0ee] bg-white px-4 py-8 text-center text-sm text-[#7f88a6]">
        {emptyMessage || "No questions yet."}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}
