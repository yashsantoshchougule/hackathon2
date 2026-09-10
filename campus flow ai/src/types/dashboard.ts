export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type LoadState = 'ready' | 'loading' | 'error'
export type Task = { id: string; title: string; subject: string; dueAt?: string; estimatedMinutes?: number; priority: Priority; completed: boolean }
export type DashboardData = {
  student: { id: string; name: string; course: string; semester: string; avatarUrl?: string }
  summary: { classesToday: number; pendingAssignments: number; overallAttendance: number | null; upcomingExams: number }
  nextAction: { id: string; title: string; subject: string; reason: string; estimatedMinutes: number; deadline?: string; priority: Priority } | null
  schedule: Array<{ id: string; subject: string; startTime: string; endTime: string; location?: string; type: 'lecture' | 'practical' | 'exam' | 'event' }>
  priorityTasks: Task[]
  attendance: Array<{ subjectId: string; subjectName: string; attendedClasses: number; totalClasses: number; percentage: number | null; minimumRequired: number }>
  deadlines: Array<{ id: string; title: string; subject: string; type: 'assignment' | 'exam' | 'form' | 'event'; dueAt: string; priority?: Priority }>
  notice: { id: string; title: string; source: string; publishedAt: string; extractedDeadline?: string; requiresConfirmation: boolean; relevance?: string } | null
  studyProgress?: { plannedMinutes: number; completedMinutes: number; completedTasks: number; streakDays?: number }
}
export type DashboardInput = Partial<Omit<DashboardData, 'student' | 'summary'>> & { student?: Partial<DashboardData['student']>; summary?: Partial<DashboardData['summary']> }
export type DashboardSection = 'summary' | 'nextAction' | 'schedule' | 'priorityTasks' | 'attendance' | 'deadlines' | 'notice' | 'studyProgress'
export type DashboardActions = { onTaskComplete?: (id: string, completed: boolean) => Promise<void>; onStartTask?: (id: string) => void; onRetry?: () => void }
