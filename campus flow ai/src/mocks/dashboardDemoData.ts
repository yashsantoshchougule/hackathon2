import type { DashboardData } from '../types/dashboard'
// TEMPORARY VISUAL FIXTURE. Replace with the team's Supabase integration.
// Demo data is never an authenticated user or an actual AI response.
export function createDashboardDemoData(now = new Date()): DashboardData {
  const at = (days: number, hour: number, minute = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0); return d.toISOString() }
  return {
    student: { id: 'demo-student', name: 'Krishna Koneri', course: 'B.Tech Computer Science', semester: 'Semester 4' },
    summary: { classesToday: 3, pendingAssignments: 4, overallAttendance: 82, upcomingExams: 2 },
    nextAction: { id: 'task-1', title: 'Finish your Database Systems assignment', subject: 'Database Systems', reason: 'This assignment is due tomorrow and needs about 45 minutes. Finishing it first leaves room to prepare for your upcoming exam.', estimatedMinutes: 45, deadline: at(1, 23, 59), priority: 'high' },
    schedule: [
      { id: 'class-1', subject: 'Data Structures & Algorithms', startTime: at(0, 9), endTime: at(0, 10), location: 'Room 204', type: 'lecture' },
      { id: 'class-2', subject: 'Database Systems', startTime: at(0, 11), endTime: at(0, 12), location: 'Room 108', type: 'lecture' },
      { id: 'class-3', subject: 'Operating Systems Lab', startTime: at(0, 14), endTime: at(0, 16), location: 'Computer Lab 2', type: 'practical' },
    ],
    priorityTasks: [
      { id: 'task-1', title: 'Complete SQL practice assignment', subject: 'Database Systems', dueAt: at(1, 23, 59), estimatedMinutes: 45, priority: 'high', completed: false },
      { id: 'task-2', title: 'Revise process scheduling', subject: 'Operating Systems', dueAt: at(0, 23, 59), estimatedMinutes: 30, priority: 'critical', completed: false },
      { id: 'task-3', title: 'Read notes on binary search trees', subject: 'Data Structures', dueAt: at(3, 23, 59), estimatedMinutes: 25, priority: 'medium', completed: false },
      { id: 'task-4', title: 'Organise last week’s lecture notes', subject: 'Computer Networks', estimatedMinutes: 15, priority: 'low', completed: true },
    ],
    attendance: [
      { subjectId: 'dsa', subjectName: 'Data Structures', attendedClasses: 26, totalClasses: 30, percentage: 86.7, minimumRequired: 75 },
      { subjectId: 'dbms', subjectName: 'Database Systems', attendedClasses: 24, totalClasses: 30, percentage: 80, minimumRequired: 75 },
      { subjectId: 'os', subjectName: 'Operating Systems', attendedClasses: 22, totalClasses: 30, percentage: 73.3, minimumRequired: 75 },
    ],
    deadlines: [
      { id: 'deadline-1', title: 'Process scheduling revision', subject: 'Operating Systems', type: 'assignment', dueAt: at(0, 23, 59), priority: 'critical' },
      { id: 'deadline-2', title: 'SQL practice assignment', subject: 'Database Systems', type: 'assignment', dueAt: at(1, 23, 59), priority: 'high' },
      { id: 'deadline-3', title: 'Mid-semester examination', subject: 'Data Structures', type: 'exam', dueAt: at(9, 10), priority: 'medium' },
    ],
    notice: { id: 'notice-1', title: 'Mid-semester examination registration', source: 'Academic Office', publishedAt: at(-1, 10), extractedDeadline: at(3, 17), requiresConfirmation: true, relevance: 'For Semester 4 students. Review the notice and confirm the registration deadline.' },
    studyProgress: { plannedMinutes: 600, completedMinutes: 390, completedTasks: 7 },
  }
}
