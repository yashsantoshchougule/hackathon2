import type { PropsWithChildren, ReactNode } from 'react'

export function AuthFrame({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: ReactNode }>) {
  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="auth-title">
      <a className="brand" href="/">CampusFlow</a>
      <h1 id="auth-title">{title}</h1>
      <p className="muted">{subtitle}</p>
      {children}
    </section>
  </main>
}

export function FormNotice({ message, kind = 'error' }: { message: string; kind?: 'error' | 'success' }) {
  return <p className={`notice ${kind}`} role="status">{message}</p>
}
