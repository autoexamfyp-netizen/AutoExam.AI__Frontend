/**
 * Centralized mock data for the student dashboard.
 * Replace fetch calls with API modules later; keep the same shapes where possible.
 */

/** @typedef {'mcq' | 'short' | 'essay'} QuestionType */

export const STUDENT_DASHBOARD_STATS = {
  overallAverage: 78.4,
  examsAttempted: 12,
  pendingExams: 3,
  lastScore: 82,
}

/** Points for small trend / sparkline (last months or sessions) */
export const STUDENT_PERFORMANCE_TREND = [
  { label: "W1", score: 72 },
  { label: "W2", score: 75 },
  { label: "W3", score: 71 },
  { label: "W4", score: 79 },
  { label: "W5", score: 82 },
  { label: "Now", score: 78 },
]

/** Last 5 graded attempts for snapshot list */
export const STUDENT_RECENT_PERFORMANCES = [
  { id: "perf-1", examTitle: "Data Structures Quiz", score: 84, maxScore: 100, date: "2026-05-02" },
  { id: "perf-2", examTitle: "Database Systems Mid", score: 76, maxScore: 100, date: "2026-04-28" },
  { id: "perf-3", examTitle: "AI Lab Exam", score: 41, maxScore: 50, date: "2026-04-20" },
  { id: "perf-4", examTitle: "OS Concepts", score: 68, maxScore: 100, date: "2026-04-12" },
  { id: "perf-5", examTitle: "Programming Fundamentals", score: 91, maxScore: 100, date: "2026-04-05" },
]

export const STUDENT_NOTIFICATIONS = [
  {
    id: "n1",
    title: "New exam available",
    body: "Software Engineering Mid-Term is now open until May 18.",
    when: "25 min ago",
    tone: "info",
  },
  {
    id: "n2",
    title: "Results published",
    body: "Your Data Structures Quiz results are ready to view.",
    when: "3 hours ago",
    tone: "success",
  },
  {
    id: "n3",
    title: "Deadline reminder",
    body: "Computer Networks assignment exam closes in 24 hours.",
    when: "Yesterday",
    tone: "warning",
  },
]

/**
 * Tab: active | completed | missed (for exams page + home active section)
 * status: label for badges + actions
 */
export const STUDENT_EXAMS = [
  {
    id: "exam-ds-final",
    title: "Data Structures Final",
    code: "CS-220",
    durationMinutes: 120,
    deadline: "2026-05-18T23:59:00",
    attemptsAllowed: 1,
    attemptsUsed: 0,
    tab: "active",
    status: "available",
    questionsCount: 40,
    totalMarks: 100,
  },
  {
    id: "exam-se-mid",
    title: "Software Engineering Mid-Term",
    code: "CS-410",
    durationMinutes: 90,
    deadline: "2026-05-15T18:00:00",
    attemptsAllowed: 1,
    attemptsUsed: 0,
    tab: "active",
    status: "available",
    questionsCount: 35,
    totalMarks: 100,
  },
  {
    id: "exam-cn-quiz",
    title: "Computer Networks Quiz",
    code: "CS-340",
    durationMinutes: 45,
    deadline: "2026-05-08T12:00:00",
    attemptsAllowed: 1,
    attemptsUsed: 0,
    tab: "active",
    status: "upcoming",
    questionsCount: 25,
    totalMarks: 50,
  },
  {
    id: "exam-ds-quiz",
    title: "Data Structures Quiz",
    code: "CS-220",
    durationMinutes: 60,
    deadline: "2026-05-02T23:59:00",
    attemptsAllowed: 1,
    attemptsUsed: 1,
    tab: "completed",
    status: "completed",
    questionsCount: 30,
    totalMarks: 100,
  },
  {
    id: "exam-db-mid",
    title: "Database Systems Mid",
    code: "CS-330",
    durationMinutes: 75,
    deadline: "2026-04-28T23:59:00",
    attemptsAllowed: 1,
    attemptsUsed: 1,
    tab: "completed",
    status: "completed",
    questionsCount: 28,
    totalMarks: 100,
  },
  {
    id: "exam-ai-lab",
    title: "AI Lab Exam",
    code: "CS-412",
    durationMinutes: 60,
    deadline: "2026-04-20T23:59:00",
    attemptsAllowed: 1,
    attemptsUsed: 1,
    tab: "completed",
    status: "completed",
    questionsCount: 20,
    totalMarks: 50,
  },
  {
    id: "exam-os-missed",
    title: "Operating Systems Pop Quiz",
    code: "CS-350",
    durationMinutes: 30,
    deadline: "2026-04-10T10:00:00",
    attemptsAllowed: 1,
    attemptsUsed: 0,
    tab: "missed",
    status: "expired",
    questionsCount: 15,
    totalMarks: 30,
  },
]

/** Questions for timed attempt UI (subset for demo) */
export const STUDENT_EXAM_QUESTIONS = {
  "exam-ds-final": [
    {
      id: "q1",
      type: "mcq",
      marks: 2,
      prompt: "Which structure follows LIFO discipline?",
      options: ["Queue", "Stack", "Deque", "Priority Queue"],
      correctIndex: 1,
    },
    {
      id: "q2",
      type: "mcq",
      marks: 2,
      prompt: "Average case time complexity of quicksort (random pivot)?",
      options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
      correctIndex: 1,
    },
    {
      id: "q3",
      type: "short",
      marks: 5,
      prompt: "Explain the difference between a binary search tree and a balanced AVL tree in two sentences.",
    },
    {
      id: "q4",
      type: "essay",
      marks: 10,
      prompt: "Discuss how hash collisions are resolved with chaining versus open addressing. Include one trade-off for each.",
    },
  ],
  "exam-se-mid": [
    {
      id: "q1",
      type: "mcq",
      marks: 2,
      prompt: "Which agile ceremony focuses on process improvement?",
      options: ["Daily standup", "Sprint retrospective", "Sprint planning", "Backlog grooming"],
      correctIndex: 1,
    },
    {
      id: "q2",
      type: "short",
      marks: 4,
      prompt: "List two qualities of a good software requirements specification.",
    },
    {
      id: "q3",
      type: "essay",
      marks: 8,
      prompt: "Compare waterfall and iterative models for a university project with changing requirements.",
    },
  ],
}

export const STUDENT_RESULTS = [
  {
    id: "res-ds-quiz",
    examId: "exam-ds-quiz",
    examTitle: "Data Structures Quiz",
    attemptedAt: "2026-05-02T14:20:00",
    totalScore: 84,
    maxScore: 100,
    percentage: 84,
    passed: true,
    mcqScore: 38,
    mcqMax: 40,
    writtenScore: 46,
    writtenMax: 60,
    summary: "Strong on trees and traversals; review hashing details before the final.",
  },
  {
    id: "res-db-mid",
    examId: "exam-db-mid",
    examTitle: "Database Systems Mid",
    attemptedAt: "2026-04-28T11:05:00",
    totalScore: 76,
    maxScore: 100,
    percentage: 76,
    passed: true,
    mcqScore: 34,
    mcqMax: 40,
    writtenScore: 42,
    writtenMax: 60,
    summary: "Normalization answers were solid; transaction isolation needs work.",
  },
  {
    id: "res-ai-lab",
    examId: "exam-ai-lab",
    examTitle: "AI Lab Exam",
    attemptedAt: "2026-04-20T09:40:00",
    totalScore: 41,
    maxScore: 50,
    percentage: 82,
    passed: true,
    mcqScore: 18,
    mcqMax: 20,
    writtenScore: 23,
    writtenMax: 30,
    summary: "Excellent grasp of search basics; expand on heuristic explanations.",
  },
]

export const STUDENT_FEEDBACK = {
  resultId: "res-ds-quiz",
  examTitle: "Data Structures Quiz",
  generatedAt: "2026-05-02T16:00:00",
  topics: [
    { name: "Trees & traversals", scorePercent: 92 },
    { name: "Hashing", scorePercent: 68 },
    { name: "Graphs", scorePercent: 81 },
    { name: "Sorting", scorePercent: 88 },
    { name: "Heaps / priority queues", scorePercent: 74 },
  ],
  strengths: [
    "Clear explanations on BST invariants and rotation intuition.",
    "MCQ accuracy on complexity classes is consistently high.",
  ],
  weaknesses: [
    "Open addressing collision resolution was incomplete.",
    "One graph traversal edge case was missed in the short answer.",
  ],
  recommendations: [
    "Redo textbook exercises on linear probing vs quadratic probing.",
    "Practice one timed drill on Dijkstra vs BFS when weights are uniform.",
  ],
  aiDetection: {
    probability: 0.12,
    flagged: false,
    label: "Low likelihood of AI-generated text",
    notes: "Writing style and mistake patterns align with human composition.",
  },
}

export const STUDENT_ANALYTICS = {
  improvementPercent: 9.2,
  weakTopicsTrend: [
    { topic: "Hashing", avg: 62 },
    { topic: "Hashing", avg: 65 },
    { topic: "Hashing", avg: 68 },
    { topic: "Hashing", avg: 70 },
  ],
  performanceOverTime: [
    { date: "Mar", avg: 71 },
    { date: "Apr", avg: 74 },
    { date: "May", avg: 78 },
  ],
  recentMetrics: [
    { label: "Avg last 3 exams", value: "79.3%" },
    { label: "Completion rate", value: "92%" },
    { label: "On-time submissions", value: "11/12" },
  ],
}

export function getStudentExamById(examId) {
  return STUDENT_EXAMS.find((e) => e.id === examId) ?? null
}

export function getExamQuestionsForAttempt(examId) {
  return STUDENT_EXAM_QUESTIONS[examId] ?? STUDENT_EXAM_QUESTIONS["exam-ds-final"]
}

export function filterExamsByTab(tab) {
  return STUDENT_EXAMS.filter((e) => e.tab === tab)
}

/**
 * Simulated API: dashboard bundle
 * @param {number} [delayMs]
 */
export async function fetchStudentDashboardMock(delayMs = 450) {
  await new Promise((r) => setTimeout(r, delayMs))
  return {
    stats: STUDENT_DASHBOARD_STATS,
    trend: STUDENT_PERFORMANCE_TREND,
    recentPerformances: STUDENT_RECENT_PERFORMANCES,
    notifications: STUDENT_NOTIFICATIONS,
    activeExams: STUDENT_EXAMS.filter((e) => e.tab === "active"),
  }
}

export async function fetchStudentResultsMock(delayMs = 400) {
  await new Promise((r) => setTimeout(r, delayMs))
  return [...STUDENT_RESULTS]
}

export async function fetchStudentFeedbackMock(delayMs = 350) {
  await new Promise((r) => setTimeout(r, delayMs))
  return { ...STUDENT_FEEDBACK }
}

export async function fetchStudentAnalyticsMock(delayMs = 400) {
  await new Promise((r) => setTimeout(r, delayMs))
  return { ...STUDENT_ANALYTICS }
}
