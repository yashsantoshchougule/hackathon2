import { useEffect, useState } from 'react'
import { AcademicHubPage } from './pages/AcademicHubPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { TimetablePage } from './pages/TimetablePage'
import { ExaminationsPage } from './pages/ExaminationsPage'
import { AttendancePage } from './pages/AttendancePage'
import { RemindersPage } from './pages/RemindersPage'
import { AssignmentDetailsPage } from './pages/AssignmentDetailsPage'
import { ExaminationDetailsPage } from './pages/ExaminationDetailsPage'
import { CalendarPage } from './pages/CalendarPage'
import { Icon, type IconName } from './components/academic/ui'
import './App.css'

type RouteName = 'academics' | 'assignments' | 'timetable' | 'examinations' | 'attendance' | 'reminders'

const routeFor = (path: string): RouteName => {
  if (path.startsWith('/assignments')) return 'assignments'
  if (path.startsWith('/timetable') || path.startsWith('/calendar')) return 'timetable'
  if (path.startsWith('/examinations')) return 'examinations'
  if (path.startsWith('/attendance')) return 'attendance'
  if (path.startsWith('/reminders')) return 'reminders'
  return 'academics'
}

const nav: Array<{ id: RouteName; label: string; href: string; icon: IconName }> = [
  { id: 'academics', label: 'Academic hub', href: '/academics', icon: 'grid' },
  { id: 'assignments', label: 'Assignments', href: '/assignments', icon: 'checklist' },
  { id: 'timetable', label: 'Timetable', href: '/timetable', icon: 'calendar' },
  { id: 'examinations', label: 'Examinations', href: '/examinations', icon: 'cap' },
  { id: 'attendance', label: 'Attendance', href: '/attendance', icon: 'chart' },
  { id: 'reminders', label: 'Reminders', href: '/reminders', icon: 'bell' },
]

function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const current = routeFor(path)
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const navigate = (href: string) => {
    if (href === window.location.pathname) return
    window.history.pushState({}, '', href)
    setPath(href)
    setSidebarOpen(false)
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
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Academic navigation">
        <a className="brand" href="/academics" onClick={(event) => { event.preventDefault(); navigate('/academics') }}><span className="brand-mark"><span></span><span></span><span></span></span><span>Campus<span>Flow</span></span></a>
        <div className="workspace-label">STUDENT WORKSPACE</div>
        <nav className="side-nav">{nav.map((item) => <a key={item.id} className={current === item.id ? 'active' : ''} href={item.href} onClick={(event) => { event.preventDefault(); navigate(item.href) }}><Icon name={item.icon} size={19} /><span>{item.label}</span></a>)}</nav>
        <div className="sidebar-footer"><div className="secure-badge"><Icon name="lock" size={15} />Academic data is protected</div><a href="#support" onClick={(event) => event.preventDefault()}><Icon name="help" size={18} />Help & support</a></div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="main-area"><header className="topbar"><button className="menu-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Icon name="menu" size={21} /></button><div className="crumb"><span>CampusFlow</span><Icon name="chevron" size={14} /><strong>Academics</strong></div><div className="top-actions"><span className="sync-indicator"><i></i>Secure workspace</span><button className="icon-button" aria-label="Notifications"><Icon name="bell" size={20} /></button></div></header><div className="page-content">{page}</div></main>
    </div>
  )
}
export default App
