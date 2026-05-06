import { Navigate, Route, Routes } from "react-router-dom"
import App from "./App"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import TeacherDashboardPage from "./pages/TeacherDashboardPage"
import StudentDashboardPage from "./pages/StudentDashboardPage"
import AuthCallbackPage from "./pages/AuthCallbackPage"

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/teacher-dashboard" element={<TeacherDashboardPage />} />
      <Route path="/student-dashboard" element={<StudentDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
