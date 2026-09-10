import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Sparkles, CalendarDays, ChartNoAxesCombined, Megaphone, BookOpen, GraduationCap, AlarmClock, Bell, Settings, PanelLeftClose, PanelLeftOpen, Menu, X, Search, ChevronDown, ArrowUpRight } from 'lucide-react'
import { Logo } from '../common/UI'
import type { DashboardData } from '../../types/dashboard'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/planner', label: 'Study Planner', icon: CalendarDays }, { to: '/attendance', label: 'Attendance', icon: ChartNoAxesCombined },
  { to: '/notices', label: 'Notices', icon: Megaphone }, { to: '/study-copilot', label: 'Study Copilot', icon: BookOpen },
  { to: '/academics', label: 'Academic Hub', icon: GraduationCap }, { to: '/reminders', label: 'Reminders', icon: AlarmClock },
  { to: '/notifications', label: 'Notifications', icon: Bell }, { to: '/settings', label: 'Settings', icon: Settings },
]
export function AppShell({ children, student }: { children: ReactNode; student?: Partial<DashboardData['student']> }) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('campusflow-sidebar') === 'collapsed' } catch { return false } })
  const [mobile, setMobile] = useState(false)
  const [profile, setProfile] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()
  const drawer = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const title = navigation.find(item => item.to === location.pathname)?.label ?? 'Workspace'
  useEffect(() => { document.title = `${title} · CampusFlow` }, [title])
  useEffect(() => {
    if (!mobile) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawer.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobile(false); menuButton.current?.focus() }
      if (e.key !== 'Tab') return
      const items = drawer.current?.querySelectorAll<HTMLElement>('a,button')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', trap) }
  }, [mobile])
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!profileRef.current?.contains(e.target as Node)) setProfile(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  function toggle() { setCollapsed(value => { try { localStorage.setItem('campusflow-sidebar', value ? 'expanded' : 'collapsed') } catch { /* Navigation remains usable without storage. */ } return !value }) }
  return <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    {mobile && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => { setMobile(false); menuButton.current?.focus() }} />}
    <aside ref={drawer} className={`sidebar ${mobile ? 'is-open' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label="Main navigation">
      <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => { setMobile(false); menuButton.current?.focus() }}><X /></button>
      <Logo /><span className="nav-label">WORKSPACE</span>
      <nav>{navigation.map((item, index) => <NavLink key={item.to} to={item.to} aria-label={item.label} title={collapsed ? item.label : undefined} onClick={() => setMobile(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${index === 8 ? 'nav-divider' : ''}`}><item.icon /><span>{item.label}</span>{item.to === '/assistant' && <span className="mini-ai">AI</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="campusflow-help"><Sparkles /><h3>A little clarity goes a long way.</h3><p>Let’s find your next best step.</p><Link to="/assistant" onClick={() => setMobile(false)}>Ask CampusFlow <ArrowUpRight /></Link></div><button className="collapse-button" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>Collapse sidebar</span></button></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar-title"><button ref={menuButton} className="icon-button mobile-toggle" aria-label="Open navigation" aria-expanded={mobile} onClick={() => setMobile(true)}><Menu /></button><span className="breadcrumb">Workspace <span>/</span></span><strong>{title}</strong></div>
      <div className="topbar-tools"><div className="search-wrap"><label className="search-field"><Search /><input aria-label="Search navigation" placeholder="Find your way around…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setQuery('') }} /><kbd>⌕</kbd></label>{query && <div className="search-results">{navigation.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map(item => <Link key={item.to} to={item.to} onClick={() => setQuery('')}>{item.label}<ArrowUpRight /></Link>)}{!navigation.some(item => item.label.toLowerCase().includes(query.toLowerCase())) && <p>No matching pages.</p>}</div>}</div>
        <Link className="icon-button notification-button" to="/notifications" aria-label="Notifications"><Bell /></Link>
        <div className="profile" ref={profileRef} onKeyDown={e => { if (e.key === 'Escape') { setProfile(false); profileRef.current?.querySelector('button')?.focus() } }}><button className="profile-button" aria-expanded={profile} aria-controls="profile-links" onClick={() => setProfile(!profile)}><span className="avatar">{student?.avatarUrl ? <img src={student.avatarUrl} alt="" /> : (student?.name ?? 'Student').split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="profile-info"><strong>{student?.name ?? 'Student'}</strong><small>{student?.semester ?? 'Your workspace'}</small></span><ChevronDown /></button>{profile && <div id="profile-links" className="profile-dropdown"><p>{student?.course ?? 'Course not connected'}</p><Link to="/settings">Profile & settings</Link><Link to="/">CampusFlow home</Link></div>}</div>
      </div></header><main id="main-content" className="main-content" tabIndex={-1}>{children}</main><footer className="workspace-footer"><span>CampusFlow · A clearer path through college.</span><span>Made for your next step <Sparkles size={12} /></span></footer></div>
  </div>
}
