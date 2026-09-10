import type { AppRole } from './auth'

// Shared contract for feature branches. Generated Supabase types can replace this
// after the project is linked; these names intentionally mirror the migrations.
export type ProfileRow = {
  id: string
  full_name: string
  avatar_path: string | null
  college_name: string | null
  course_id: string | null
  semester_id: string | null
  academic_year: number | null
  timezone: string
  minimum_attendance_percentage: number
  onboarding_completed: boolean
}

export type UserRoleRow = { user_id: string; role: AppRole }
export type StudentSubjectRow = { id: string; user_id: string; subject_id: string; academic_year: number; enrolment_status: 'active' | 'dropped' | 'completed' }
export type DocumentRow = { id: string; owner_user_id: string; storage_bucket: 'academic-documents' | 'avatars'; storage_path: string; processing_status: 'uploaded' | 'processing' | 'ready' | 'failed' }
