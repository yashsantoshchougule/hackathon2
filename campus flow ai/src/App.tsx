import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { AccountSecurityPage } from './pages/AccountSecurityPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import './App.css'

function DashboardLanding() {
  const { user, profile, role, signOut } = useAuth()
  return <main className="app-page"><section className="settings-card"><p className="brand">CampusFlow</p><h1>Welcome{profile?.fullName ? `, ${profile.fullName}` : ''}</h1><p className="muted">Your authenticated dashboard contract is ready for the dashboard branch.</p><dl className="account-summary"><dt>Email</dt><dd>{user?.email}</dd><dt>Role</dt><dd>{role}</dd><dt>Course</dt><dd>{profile?.course?.name ?? 'Not configured'}</dd></dl><p className="form-links"><a href="/profile">Profile</a><a href="/settings/security">Account security</a></p><button className="secondary" onClick={() => void signOut().then(() => window.location.assign('/login'))}>Sign out</button></section></main>
}

function Routes() {
  switch (window.location.pathname) {
    case '/': case '/login': return <LoginPage />
    case '/register': return <RegisterPage />
    case '/forgot-password': return <ForgotPasswordPage />
    case '/reset-password': return <ResetPasswordPage />
    case '/auth/callback': return <AuthCallbackPage />
    case '/onboarding': return <OnboardingPage />
    case '/profile': return <ProfilePage />
    case '/settings/security': return <AccountSecurityPage />
    case '/access-denied': return <AccessDeniedPage />
    case '/dashboard': return <ProtectedRoute><DashboardLanding /></ProtectedRoute>
    default: return <AccessDeniedPage />
  }
}

export default function App() { return <AuthProvider><Routes /></AuthProvider> }
