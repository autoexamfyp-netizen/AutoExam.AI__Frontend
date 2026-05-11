import { Navigate, Route, Routes } from "react-router-dom"
import App from "./App"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import TeacherLayout from "./components/teacher/TeacherLayout"
import TeacherHomePage from "./pages/teacher/TeacherHomePage"
import TeacherMaterialsPage from "./pages/teacher/TeacherMaterialsPage"
import TeacherGenerateExamPage from "./pages/teacher/TeacherGenerateExamPage"
import TeacherExamReviewPage from "./pages/teacher/TeacherExamReviewPage"
import TeacherPublishedExamsPage from "./pages/teacher/TeacherPublishedExamsPage"
import TeacherQuestionBankPage from "./pages/teacher/TeacherQuestionBankPage"
import TeacherSubmissionsPage from "./pages/teacher/TeacherSubmissionsPage"
import TeacherEvaluationPage from "./pages/teacher/TeacherEvaluationPage"
import TeacherAiDetectionPage from "./pages/teacher/TeacherAiDetectionPage"
import TeacherAnalyticsPage from "./pages/teacher/TeacherAnalyticsPage"
import TeacherFeedbackPage from "./pages/teacher/TeacherFeedbackPage"
import TeacherSettingsPage from "./pages/teacher/TeacherSettingsPage"
import StudentLayout from "./components/student/StudentLayout"
import StudentDashboardHomePage from "./pages/student/StudentDashboardHomePage"
import StudentExamsPage from "./pages/student/StudentExamsPage"
import StudentExamAttemptPage from "./pages/student/StudentExamAttemptPage"
import StudentResultsPage from "./pages/student/StudentResultsPage"
import StudentFeedbackPage from "./pages/student/StudentFeedbackPage"
import StudentProgressPage from "./pages/student/StudentProgressPage"
import AuthCallbackPage from "./pages/AuthCallbackPage"
import CheckEmailPage from "./pages/CheckEmailPage"
import VerificationFailedPage from "./pages/VerificationFailedPage"
import VerifyEmailRequiredPage from "./pages/VerifyEmailRequiredPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import OtpVerifyPage from "./pages/OtpVerifyPage"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import GuestRoute from "./components/auth/GuestRoute"

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        }
      />

      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/check-email" element={<CheckEmailPage />} />
      <Route path="/auth/verification-failed" element={<VerificationFailedPage />} />
      <Route path="/auth/verify-required" element={<VerifyEmailRequiredPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/verify-otp" element={<OtpVerifyPage />} />

      <Route
        path="/teacher-dashboard"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherHomePage />} />
        <Route path="materials" element={<TeacherMaterialsPage />} />
        <Route path="generate-exam" element={<TeacherGenerateExamPage />} />
        <Route path="exams/:examId/review" element={<TeacherExamReviewPage />} />
        <Route path="published-exams" element={<TeacherPublishedExamsPage />} />
        <Route path="question-bank" element={<TeacherQuestionBankPage />} />
        <Route path="submissions" element={<TeacherSubmissionsPage />} />
        <Route path="evaluation" element={<TeacherEvaluationPage />} />
        <Route path="ai-detection" element={<TeacherAiDetectionPage />} />
        <Route path="analytics" element={<TeacherAnalyticsPage />} />
        <Route path="feedback" element={<TeacherFeedbackPage />} />
        <Route path="settings" element={<TeacherSettingsPage />} />
      </Route>
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboardHomePage />} />
        <Route path="exams" element={<StudentExamsPage />} />
        <Route path="exams/:publishedId/attempt" element={<StudentExamAttemptPage />} />
        <Route path="results" element={<StudentResultsPage />} />
        <Route path="feedback" element={<StudentFeedbackPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
