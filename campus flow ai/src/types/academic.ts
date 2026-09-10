export type SourceType = 'faculty' | 'student' | 'notice_extraction' | 'system_import'
export type VerificationStatus = 'verified' | 'student_confirmed' | 'pending_confirmation' | 'unverified' | 'rejected'
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type AttendanceRisk = 'safe' | 'warning' | 'critical' | 'unknown'
export type ReminderStatus = 'scheduled' | 'sent' | 'completed' | 'dismissed' | 'cancelled' | 'failed'

export interface RecordMeta { id: string; source_type: SourceType; verification_status: VerificationStatus; created_at: string; updated_at: string }
export interface Subject { id: string; code?: string; title: string; color?: string; minimum_attendance_percentage?: number | null }
export interface Assignment extends RecordMeta { title: string; description?: string | null; subject_id: string; subject?: Subject | null; due_at: string | null; assigned_at?: string | null; estimated_minutes?: number | null; priority: Priority; status: AssignmentStatus; attachment_url?: string | null; editable: boolean }
export interface AssignmentInput { title: string; description?: string; subject_id: string; due_at?: string | null; estimated_minutes?: number | null; priority: Priority }
export interface TimetableEntry extends RecordMeta { subject_id?: string | null; subject?: Subject | null; entry_type: 'lecture' | 'practical' | 'tutorial' | 'exam' | 'event' | 'personal'; starts_at: string; ends_at: string; timezone: string; location?: string | null; recurrence?: string | null; editable: boolean; change_note?: string | null }
export interface TimetableInput { subject_id?: string | null; entry_type: TimetableEntry['entry_type']; starts_at: string; ends_at: string; timezone: string; location?: string; recurrence?: string }
export interface Examination extends RecordMeta { subject_id: string; subject?: Subject | null; title: string; exam_type: 'internal' | 'practical' | 'semester' | 'unit_test' | 'viva' | 'other'; starts_at: string; ends_at?: string | null; timezone: string; venue?: string | null; syllabus_url?: string | null; maximum_marks?: number | null; editable: boolean }
export interface ExaminationInput { subject_id: string; title: string; exam_type: Examination['exam_type']; starts_at: string; ends_at?: string | null; timezone: string; venue?: string; syllabus_url?: string; maximum_marks?: number | null }
export interface AttendanceSubject { subject: Subject; attended_classes: number; held_classes: number; percentage: number | null; minimum_required_percentage: number | null; risk: AttendanceRisk; last_updated_at?: string | null; source_type: SourceType; verification_status: VerificationStatus }
export interface AttendanceSummary { overall_percentage: number | null; subjects: AttendanceSubject[] }
export interface AttendanceSimulation { subject_id: string; current_percentage: number | null; simulated_percentage: number | null; future_classes: number; action: 'attend' | 'miss'; recovery_classes: number | null; safe_misses: number | null; risk: AttendanceRisk }
export interface Reminder extends RecordMeta { title: string; description?: string | null; scheduled_at: string; timezone: string; status: ReminderStatus; source_entity_type: 'assignment' | 'examination' | 'timetable' | 'attendance' | 'notice' | 'study_plan' | 'atkt_application' | 'personal'; source_entity_id?: string | null; destination_route?: string | null; editable: boolean }
export interface ReminderInput { title: string; description?: string; scheduled_at: string; timezone: string; source_entity_type?: Reminder['source_entity_type']; source_entity_id?: string }
export interface DashboardSummary { today: string; classes_today: TimetableEntry[]; next_class: TimetableEntry | null; pending_assignments: Assignment[]; pending_assignment_count: number; upcoming_examinations: Examination[]; upcoming_exam_count: number; attendance: { overall_percentage: number | null; risk_subjects: AttendanceSubject[] }; upcoming_deadlines: Assignment[]; active_reminders: Reminder[]; warnings: string[]; last_updated_at?: string }
export interface ListResult<T> { items: T[]; page: number; page_size: number; total: number }
export interface AcademicApiErrorPayload { error?: { code?: string; message?: string; request_id?: string }; detail?: string }
export class AcademicApiError extends Error { status: number; code: string; requestId?: string; constructor(message: string, status = 500, code = 'ACADEMIC_REQUEST_FAILED', requestId?: string) { super(message); this.name = 'AcademicApiError'; this.status = status; this.code = code; this.requestId = requestId } }
