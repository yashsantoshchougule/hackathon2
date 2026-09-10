import type { Session, User } from '@supabase/supabase-js'

export type AppRole = 'student' | 'faculty' | 'hod' | 'admin'

export type Course = { id: string; name: string }
export type Semester = { id: string; name: string }

export type Profile = {
  id: string
  fullName: string
  avatarPath: string | null
  collegeName: string | null
  courseId: string | null
  semesterId: string | null
  academicYear: number | null
  timezone: string
  minimumAttendancePercentage: number
  onboardingCompleted: boolean
  course?: Course | null
  semester?: Semester | null
}

export type CampusFlowUser = {
  id: string
  email: string | null
  role: AppRole
  profile: {
    fullName: string
    avatarUrl?: string
    course?: Course
    semester?: Semester
    timezone: string
    onboardingCompleted: boolean
  } | null
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: AppRole | null
  loading: boolean
  profileLoading: boolean
  isAuthenticated: boolean
  isOnboarded: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export type SignUpInput = { fullName: string; email: string; password: string }
