import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AiShell } from './components/ai/AiShell'
import { EmptyState } from './components/ai/Feedback'
import { AssistantPage } from './pages/AssistantPage'
import { NoticesPage } from './pages/NoticesPage'
import { StudyCopilotPage } from './pages/StudyCopilotPage'
import { StudyPlannerPage } from './pages/StudyPlannerPage'

function IntegrationPendingPage({ feature }: { feature: string }) {
  const params = useParams()
  const hasRecord = Boolean(params.resourceId || params.assignmentId)
  return (
    <EmptyState
      title={`${feature} integration pending`}
      message={`The shared ${feature.toLowerCase()} page is not present on this branch.${hasRecord ? ' The verified record link has been preserved for integration.' : ''}`}
    />
  )
}

function App() {
  return (
    <AiShell>
      <Routes>
        <Route path="/" element={<Navigate to="/assistant" replace />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/planner" element={<StudyPlannerPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/notices/:noticeId" element={<NoticesPage />} />
        <Route path="/study-copilot" element={<StudyCopilotPage />} />
        <Route path="/resources/:resourceId" element={<IntegrationPendingPage feature="Resources" />} />
        <Route path="/assignments/:assignmentId" element={<IntegrationPendingPage feature="Assignments" />} />
        <Route path="/attendance" element={<IntegrationPendingPage feature="Attendance" />} />
        <Route path="/timetable" element={<IntegrationPendingPage feature="Timetable" />} />
        <Route path="/examinations" element={<IntegrationPendingPage feature="Examinations" />} />
        <Route path="*" element={<EmptyState title="Page not found" message="This CampusFlow route does not exist." />} />
      </Routes>
    </AiShell>
  )
}

export default App
