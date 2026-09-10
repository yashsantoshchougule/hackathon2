import type { ReactNode } from 'react'
import { Route, Routes as RouterRoutes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from './components/ai/Feedback'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { AccountSecurityPage } from './pages/AccountSecurityPage'
import { AcademicHubPage } from './pages/AcademicHubPage'
import { AssistantPage } from './pages/AssistantPage'
import { AssignmentDetailsPage } from './pages/AssignmentDetailsPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { AttendancePage } from './pages/AttendancePage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExaminationDetailsPage } from './pages/ExaminationDetailsPage'
import { ExaminationsPage } from './pages/ExaminationsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NoticesPage } from './pages/NoticesPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { RemindersPage } from './pages/RemindersPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { StudyCopilotPage } from './pages/StudyCopilotPage'
import { StudyPlannerPage } from './pages/StudyPlannerPage'
import { TimetablePage } from './pages/TimetablePage'
import './App.css'

function useStudentSummary() {
  const { user, profile } = useAuth()
  return {
    id: user?.id ?? '',
    name: profile?.fullName || user?.email?.split('@')[0] || 'Student',
    course: profile?.course?.name || 'Course not configured',
    semester: profile?.semester?.name || 'Semester not configured',
  }
}

function DashboardLanding() {
  const student = useStudentSummary()
  return <DashboardPage data={{ student }} />
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  return <AppShell student={useStudentSummary()}>{children}</AppShell>
}

function AppRoutes() {
  const path = useLocation().pathname
  switch (path) {
    case '/': return <LandingPage />
    case '/demo': return <DashboardPage />
    case '/login': return <LoginPage />
    case '/register': return <RegisterPage />
    case '/forgot-password': return <ForgotPasswordPage />
    case '/reset-password': return <ResetPasswordPage />
    case '/auth/callback': return <AuthCallbackPage />
    case '/onboarding': return <OnboardingPage />
    case '/profile': return <ProtectedRoute><ProfilePage /></ProtectedRoute>
    case '/settings/security': return <ProtectedRoute><AccountSecurityPage /></ProtectedRoute>
    case '/access-denied': return <AccessDeniedPage />
    case '/dashboard': return <ProtectedRoute><DashboardLanding /></ProtectedRoute>
    default:
      if (isAcademicPath(path)) return <ProtectedRoute><AcademicWorkspace /></ProtectedRoute>
      if (isAiPath(path)) return <ProtectedRoute><AiWorkspace /></ProtectedRoute>
      return <AccessDeniedPage />
  }
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}

type RouteName = 'academics' | 'assignments' | 'timetable' | 'examinations' | 'attendance' | 'reminders'

const routeFor = (path: string): RouteName => {
  if (path.startsWith('/assignments')) return 'assignments'
  if (path.startsWith('/timetable') || path.startsWith('/calendar')) return 'timetable'
  if (path.startsWith('/examinations')) return 'examinations'
  if (path.startsWith('/attendance')) return 'attendance'
  if (path.startsWith('/reminders')) return 'reminders'
  return 'academics'
}

function isAcademicPath(path: string) {
  return ['/academics', '/assignments', '/timetable', '/calendar', '/examinations', '/attendance', '/reminders'].includes(path)
    || /^\/(assignments|examinations)\/[^/]+$/.test(path)
}

function isAiPath(path: string) {
  return ['/assistant', '/planner', '/notices', '/study-copilot'].includes(path)
    || /^\/(notices|resources)\/[^/]+$/.test(path)
}

function IntegrationPendingPage() {
  const { resourceId } = useParams()
  return <EmptyState title="Resources integration pending" message={resourceId ? 'The verified resource link has been preserved for integration.' : 'The shared resources page is not available.'} />
}

function AiWorkspace() {
  return <WorkspaceShell><div className="ai-page"><RouterRoutes>
    <Route path="/assistant" element={<AssistantPage />} />
    <Route path="/planner" element={<StudyPlannerPage />} />
    <Route path="/notices" element={<NoticesPage />} />
    <Route path="/notices/:noticeId" element={<NoticesPage />} />
    <Route path="/study-copilot" element={<StudyCopilotPage />} />
    <Route path="/resources/:resourceId" element={<IntegrationPendingPage />} />
  </RouterRoutes></div></WorkspaceShell>
}

function AcademicWorkspace() {
  const path = useLocation().pathname
  const navigateTo = useNavigate()
  const current = routeFor(path)
  const navigate = (href: string) => {
    if (href === path) return
    navigateTo(href)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const assignmentId = path.match(/^\/assignments\/([^/]+)$/)?.[1]
  const examId = path.match(/^\/examinations\/([^/]+)$/)?.[1]
  const page = assignmentId ? <AssignmentDetailsPage assignmentId={assignmentId} /> : examId ? <ExaminationDetailsPage examId={examId} /> : path.startsWith('/calendar') ? <CalendarPage /> : {
    academics: <AcademicHubPage onNavigate={navigate} />,
    assignments: <AssignmentsPage />,
    timetable: <TimetablePage />,
    examinations: <ExaminationsPage />,
    attendance: <AttendancePage />,
    reminders: <RemindersPage />,
  }[current]
  return <WorkspaceShell>{page}</WorkspaceShell>
}
