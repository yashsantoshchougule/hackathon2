import { AuthFrame } from '../components/auth/AuthFrame'

export function AccessDeniedPage() {
  return <AuthFrame title="Access denied" subtitle="Your account does not have permission to open this page."><p className="form-links"><a href="/dashboard">Return to dashboard</a><a href="/login">Sign in with another account</a></p></AuthFrame>
}
