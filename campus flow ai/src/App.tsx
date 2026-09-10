import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AppShell } from './components/layout/AppShell'
import './styles/campusflow.css'
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="*" element={<AppShell><section className="card feature-pending"><span className="eyebrow">CampusFlow WORKSPACE</span><h1>This part of CampusFlow is on its way.</h1><p>This feature is not connected in the interface preview. Your academic data has not been changed.</p><Link className="button primary" to="/dashboard">Back to dashboard</Link></section></AppShell>} />
  </Routes></BrowserRouter>
}
