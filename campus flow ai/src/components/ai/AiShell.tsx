import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, CalendarDays, FileSearch, GraduationCap, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/assistant', label: 'Assistant', icon: Bot },
  { to: '/planner', label: 'Study planner', icon: CalendarDays },
  { to: '/notices', label: 'Notice intelligence', icon: FileSearch },
  { to: '/study-copilot', label: 'Study copilot', icon: GraduationCap },
]

export function AiShell({ children }: { children: ReactNode }) {
  const { user, loading, configured, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'} aria-label="CampusFlow navigation">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true"><Sparkles size={19} /></span>
          <span>CampusFlow</span>
        </div>
        <button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
        <nav className="nav-list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="trust-note">
            <span className="trust-note__dot" />
            Answers use verified campus data
          </div>
        </div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div className="topbar__context">
            <span>AI workspace</span>
          </div>
          <div className="topbar__account">
            <span className={`session-dot ${user ? 'session-dot--online' : ''}`} />
            <span className="account-label">
              {loading ? 'Checking session…' : user?.email || (configured ? 'Sign in required' : 'Integration pending')}
            </span>
            {user && (
              <button className="icon-button" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>
        {!loading && !configured && (
          <div className="integration-banner" role="status">
            Supabase is not configured. Add the required environment variables to connect authentication and academic data.
          </div>
        )}
        {!loading && configured && !user && (
          <div className="integration-banner" role="alert">
            Your session has expired. Please sign in again.
          </div>
        )}
        <main className="page">{children}</main>
      </div>
    </div>
  )
}
