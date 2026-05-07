/**
 * Centralized mock data for the teacher portal. Swap `fetchTeacher*Mock` for API modules later.
 */

export const TEACHER_DASHBOARD_STATS = {
  totalExams: 24,
  totalStudents: 186,
  activeExams: 5,
  pendingEvaluations: 12,
  aiFlags: 7,
}

export const TEACHER_PERFORMANCE_TREND = [
  { label: "W1", avg: 68 },
  { label: "W2", avg: 71 },
  { label: "W3", avg: 69 },
  { label: "W4", avg: 74 },
  { label: "W5", avg: 76 },
  { label: "Now", avg: 73 },
]

export const TEACHER_WEAKEST_TOPIC = { name: "Hashing & collisions", avgScore: 61, attempts: 142 }

export const TEACHER_RECENT_ACTIVITY = [
  { id: "a1", type: "submission", title: "New submission", detail: "12 students submitted CS Mid-Term", when: "25 min ago", tone: "info" },
  { id: "a2", type: "complete", title: "Exam completed", detail: "Programming Fundamentals closed — 93 attempts", when: "3 hr ago", tone: "success" },
  { id: "a3", type: "ai", title: "AI alert", detail: "3 answers flagged above 72% AI probability", when: "5 hr ago", tone: "warning" },
  { id: "a4", type: "feedback", title: "Feedback batch", detail: "Auto feedback generated for DS Quiz", when: "Yesterday", tone: "info" },
]

export const TEACHER_MATERIALS = [
  { id: "m1", name: "Unit3_Algorithms.pdf", type: "pdf", size: "2.4 MB", status: "completed", progress: 100, updatedAt: "2026-05-06T10:00:00" },
  { id: "m2", name: "DB_Normalization_notes.txt", type: "text", size: "18 KB", status: "processing", progress: 66, updatedAt: "2026-05-06T11:20:00" },
  { id: "m3", name: "OS_Scheduling_lecture", type: "url", size: "—", status: "pending", progress: 0, updatedAt: "2026-05-06T12:05:00" },
  { id: "m4", name: "Legacy_Midterm_2024.pdf", type: "pdf", size: "890 KB", status: "failed", progress: 0, updatedAt: "2026-05-05T09:00:00" },
]

export const TEACHER_GENERATION_CONFIG_DEFAULT = {
  mcq: 8,
  short: 4,
  essay: 2,
  totalMarks: 100,
  difficulty: { easy: 30, medium: 50, hard: 20 },
  bloom: { remember: 15, understand: 25, apply: 30, analyze: 20, evaluate: 10 },
}

export const TEACHER_GENERATED_QUESTIONS = [
  {
    id: "gq1",
    type: "mcq",
    topic: "Data structures",
    difficulty: "medium",
    bloom: "apply",
    marks: 2,
    prompt: "Which structure offers O(1) average lookup assuming a good hash function?",
    options: ["BST", "Hash table", "Linked list", "Stack"],
    modelAnswer: "Hash table",
    generatedAt: "2026-05-06T14:22:00",
  },
  {
    id: "gq2",
    type: "short",
    topic: "Complexity",
    difficulty: "easy",
    bloom: "understand",
    marks: 4,
    prompt: "State the difference between worst-case and amortized time complexity in one sentence each.",
    options: null,
    modelAnswer: "Worst-case bounds performance for a single operation; amortized averages cost over a sequence.",
    generatedAt: "2026-05-06T14:22:10",
  },
  {
    id: "gq3",
    type: "essay",
    topic: "Databases",
    difficulty: "hard",
    bloom: "evaluate",
    marks: 10,
    prompt: "Compare 3NF and BCNF with an example where they differ. Argue when BCNF is worth the decomposition cost.",
    options: null,
    modelAnswer: "BCNF removes all FD anomalies from candidate keys; 3NF may preserve dependency-preserving decomposition...",
    generatedAt: "2026-05-06T14:22:18",
  },
]

export const TEACHER_DRAFT_EXAMS = {
  "exam-draft-1": {
    id: "exam-draft-1",
    title: "CS-301 Mid-Term (Draft)",
    durationMinutes: 90,
    timerRequired: true,
    questions: [
      {
        id: "dq1",
        type: "mcq",
        topic: "Trees",
        difficulty: "medium",
        marks: 2,
        prompt: "What property must a binary search tree satisfy?",
        options: ["Left child > parent", "Left subtree keys < parent < right subtree keys", "Balanced height", "Heap order"],
        modelAnswer: "Left subtree keys < parent < right subtree keys",
      },
      {
        id: "dq2",
        type: "short",
        topic: "Graphs",
        difficulty: "easy",
        marks: 5,
        prompt: "When does BFS outperform Dijkstra for shortest path?",
        options: null,
        modelAnswer: "When edge weights are uniform (unweighted graph), BFS suffices.",
      },
    ],
  },
}

export const TEACHER_PUBLISHED_EXAMS = [
  {
    id: "pub1",
    title: "Computer Science Mid-Term",
    code: "CS-301",
    startAt: "2026-05-01T08:00:00",
    endAt: "2026-05-15T23:59:00",
    durationMinutes: 90,
    group: "CS Fall 2026",
    status: "live",
    oneAttempt: true,
    randomized: true,
    notifyDeadline: true,
  },
  {
    id: "pub2",
    title: "Database Systems Quiz",
    code: "CS-330",
    startAt: "2026-05-08T09:00:00",
    endAt: "2026-05-10T18:00:00",
    durationMinutes: 45,
    group: "CS Fall 2026",
    status: "live",
    oneAttempt: false,
    randomized: false,
    notifyDeadline: true,
  },
  {
    id: "pub3",
    title: "OS Pop Quiz",
    code: "CS-350",
    startAt: "2026-04-01T10:00:00",
    endAt: "2026-04-10T10:00:00",
    durationMinutes: 30,
    group: "CS Fall 2026",
    status: "ended",
    oneAttempt: true,
    randomized: true,
    notifyDeadline: false,
  },
]

export const TEACHER_QUESTION_BANK = [
  { id: "qb1", subject: "CS", topic: "Sorting", difficulty: "medium", type: "mcq", prompt: "Stable sort among the following?", favorite: true, useCount: 14 },
  { id: "qb2", subject: "CS", topic: "Hashing", difficulty: "hard", type: "short", prompt: "Explain double hashing vs linear probing.", favorite: false, useCount: 8 },
  { id: "qb3", subject: "CS", topic: "Graphs", difficulty: "easy", type: "mcq", prompt: "Topological sort applies to?", favorite: true, useCount: 22 },
  { id: "qb4", subject: "DB", topic: "SQL", difficulty: "medium", type: "short", prompt: "Difference between WHERE and HAVING.", favorite: false, useCount: 11 },
]

export const TEACHER_QUESTION_SUGGESTIONS = {
  frequentTopics: ["Graphs", "Sorting", "SQL joins"],
  weakTopics: ["Hashing", "Transaction isolation", "NP-completeness"],
}

export const TEACHER_SUBMISSIONS = [
  { id: "s1", studentName: "Ayesha Khan", examTitle: "CS Mid-Term", submittedAt: "2026-05-06T13:40:00", status: "graded", score: 82, maxScore: 100 },
  { id: "s2", studentName: "Bilal Hassan", examTitle: "CS Mid-Term", submittedAt: "2026-05-06T13:15:00", status: "evaluating", score: null, maxScore: 100 },
  { id: "s3", studentName: "Hamza Ali", examTitle: "DB Quiz", submittedAt: "2026-05-06T12:58:00", status: "pending", score: null, maxScore: 50 },
  { id: "s4", studentName: "Sara Malik", examTitle: "CS Mid-Term", submittedAt: "2026-05-06T11:20:00", status: "graded", score: 91, maxScore: 100 },
]

export const TEACHER_SUBMISSION_DETAIL = {
  studentName: "Ayesha Khan",
  examTitle: "Computer Science Mid-Term",
  answers: [
    { q: "BST property?", student: "Left smaller right greater", model: "Left subtree keys < parent < right subtree keys", similarity: 0.88 },
    { q: "BFS vs Dijkstra?", student: "BFS for equal weights", model: "When edge weights are uniform...", similarity: 0.79 },
  ],
}

export const TEACHER_EVALUATIONS = [
  { id: "ev1", examTitle: "CS Mid-Term", batch: "Batch A", status: "completed", pending: 0, total: 72 },
  { id: "ev2", examTitle: "DB Quiz", batch: "Batch B", status: "evaluating", pending: 14, total: 45 },
  { id: "ev3", examTitle: "OS Quiz", batch: "Batch C", status: "pending", pending: 30, total: 30 },
]

export const TEACHER_EVALUATION_DETAIL = {
  semanticSimilarity: 0.82,
  keywordMatch: 0.76,
  rubricScore: 84,
  strictness: "medium",
}

export const TEACHER_AI_DETECTIONS = [
  { id: "ai1", student: "Student 042", exam: "CS Mid-Term", probability: 0.84, risk: "high", flagged: true, excerpt: "The amortized analysis of dynamic arrays relies on..." },
  { id: "ai2", student: "Student 018", exam: "CS Mid-Term", probability: 0.71, risk: "medium", flagged: true, excerpt: "Normalization eliminates redundancy by decomposing..." },
  { id: "ai3", student: "Student 055", exam: "DB Quiz", probability: 0.38, risk: "low", flagged: false, excerpt: "A primary key uniquely identifies..." },
]

export const TEACHER_AI_SETTINGS_DEFAULT = { sensitivity: 72, flagThreshold: 70 }

export const TEACHER_ANALYTICS = {
  avgScore: 73.2,
  highest: 98,
  lowest: 34,
  completionRate: 0.87,
  weakestTopics: [
    { topic: "Hashing", failRate: 0.34 },
    { topic: "Transactions", failRate: 0.28 },
    { topic: "Recursion proofs", failRate: 0.22 },
  ],
  failedConcepts: ["Two-phase locking", "Master theorem case 2", "BCNF decomposition"],
  topPerformers: [
    { name: "Sara Malik", avg: 91 },
    { name: "Omar Sheikh", avg: 89 },
    { name: "Noor Fatima", avg: 87 },
  ],
  atRisk: [
    { name: "Student 042", avg: 44, flags: 2 },
    { name: "Student 019", avg: 52, flags: 0 },
  ],
  scoreDistribution: [
    { range: "0-50", count: 12 },
    { range: "51-65", count: 28 },
    { range: "66-80", count: 64 },
    { range: "81-100", count: 38 },
  ],
  trend: [
    { m: "Jan", v: 69 },
    { m: "Feb", v: 71 },
    { m: "Mar", v: 70 },
    { m: "Apr", v: 74 },
    { m: "May", v: 73 },
  ],
}

export const TEACHER_FEEDBACK_QUEUE = [
  { id: "fb1", student: "Ayesha Khan", exam: "CS Mid-Term", status: "draft", strengths: 3, weaknesses: 2 },
  { id: "fb2", student: "Bilal Hassan", exam: "CS Mid-Term", status: "ready", strengths: 2, weaknesses: 3 },
]

export const TEACHER_PROFILE = {
  name: "Dr. Faculty",
  department: "Computer Science",
  subjects: ["Data Structures", "Databases", "Operating Systems"],
}

export const TEACHER_PREFERENCES = {
  defaultDuration: 60,
  defaultMarks: 100,
  aiFlagThreshold: 70,
  evaluationStrictness: "medium",
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchTeacherDashboardMock(ms = 400) {
  await delay(ms)
  return {
    stats: TEACHER_DASHBOARD_STATS,
    trend: TEACHER_PERFORMANCE_TREND,
    weakest: TEACHER_WEAKEST_TOPIC,
    activity: TEACHER_RECENT_ACTIVITY,
  }
}

export async function fetchTeacherMaterialsMock(ms = 350) {
  await delay(ms)
  return [...TEACHER_MATERIALS]
}

export async function fetchTeacherPublishedMock(ms = 300) {
  await delay(ms)
  return [...TEACHER_PUBLISHED_EXAMS]
}

export async function fetchTeacherQuestionBankMock(ms = 350) {
  await delay(ms)
  return [...TEACHER_QUESTION_BANK]
}

export async function fetchTeacherSubmissionsMock(ms = 300) {
  await delay(ms)
  return [...TEACHER_SUBMISSIONS]
}

export async function fetchTeacherEvaluationsMock(ms = 300) {
  await delay(ms)
  return [...TEACHER_EVALUATIONS]
}

export async function fetchTeacherAiDetectionsMock(ms = 350) {
  await delay(ms)
  return [...TEACHER_AI_DETECTIONS]
}

export async function fetchTeacherAnalyticsMock(ms = 400) {
  await delay(ms)
  return { ...TEACHER_ANALYTICS }
}

export async function fetchTeacherFeedbackMock(ms = 300) {
  await delay(ms)
  return [...TEACHER_FEEDBACK_QUEUE]
}

export function getDraftExamById(id) {
  return TEACHER_DRAFT_EXAMS[id] ?? null
}
