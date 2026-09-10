import { supabase } from '../lib/supabase'
import type { AppRole, Profile } from '../types/auth'

type ProfileUpdate = Pick<Profile, 'id' | 'fullName' | 'avatarPath' | 'collegeName' | 'courseId' | 'semesterId' | 'academicYear' | 'timezone' | 'minimumAttendancePercentage' | 'onboardingCompleted'>

function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ''),
    avatarPath: typeof row.avatar_path === 'string' ? row.avatar_path : null,
    collegeName: typeof row.college_name === 'string' ? row.college_name : null,
    courseId: typeof row.course_id === 'string' ? row.course_id : null,
    semesterId: typeof row.semester_id === 'string' ? row.semester_id : null,
    academicYear: typeof row.academic_year === 'number' ? row.academic_year : null,
    timezone: String(row.timezone ?? 'Asia/Kolkata'),
    minimumAttendancePercentage: Number(row.minimum_attendance_percentage ?? 75),
    onboardingCompleted: Boolean(row.onboarding_completed),
  }
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error('Your profile could not be loaded.')
  if (!data) return null
  const profile = toProfile(data)
  const [courseResult, semesterResult] = await Promise.all([
    profile.courseId ? supabase.from('courses').select('id,name').eq('id', profile.courseId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    profile.semesterId ? supabase.from('semesters').select('id,name').eq('id', profile.semesterId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  if (courseResult.error || semesterResult.error) throw new Error('Your academic profile could not be loaded.')
  profile.course = courseResult.data ? { id: String(courseResult.data.id), name: String(courseResult.data.name) } : null
  profile.semester = semesterResult.data ? { id: String(semesterResult.data.id), name: String(semesterResult.data.name) } : null
  return profile
}

export async function getAppRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Your access role could not be loaded.')
  const role = data?.role
  return role === 'student' || role === 'faculty' || role === 'hod' || role === 'admin' ? role : null
}

export async function updateProfile(input: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      avatar_path: input.avatarPath,
      college_name: input.collegeName?.trim() || null,
      course_id: input.courseId,
      semester_id: input.semesterId,
      academic_year: input.academicYear,
      timezone: input.timezone,
      minimum_attendance_percentage: input.minimumAttendancePercentage,
      onboarding_completed: input.onboardingCompleted,
    })
    .eq('id', input.id)
    .select('*')
    .single()
  if (error) throw new Error('Your profile could not be saved.')
  return toProfile(data)
}

export async function saveStudyPreferences(input: {
  preferredStartTime: string
  preferredEndTime: string
  averageSessionMinutes: number
  breakMinutes: number
  preferredDays: number[]
}) {
  const { data: claims, error: claimsError } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (claimsError || typeof userId !== 'string') throw new Error('Please sign in again.')
  const { error } = await supabase.from('study_preferences').upsert({
    user_id: userId,
    preferred_start_time: input.preferredStartTime || null,
    preferred_end_time: input.preferredEndTime || null,
    average_session_minutes: input.averageSessionMinutes,
    break_minutes: input.breakMinutes,
    preferred_days: input.preferredDays,
  })
  if (error) throw new Error('Study preferences could not be saved.')
}
