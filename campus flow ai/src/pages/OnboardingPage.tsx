import { useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { saveStudyPreferences, updateProfile } from '../services/profileService'

type CatalogRow = { id: string; name: string; course_id?: string; semester_id?: string }

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [courses, setCourses] = useState<CatalogRow[]>([])
  const [semesters, setSemesters] = useState<CatalogRow[]>([])
  const [subjects, setSubjects] = useState<CatalogRow[]>([])
  const [fullName, setFullName] = useState(profile?.fullName ?? '')
  const [collegeName, setCollegeName] = useState(profile?.collegeName ?? '')
  const [courseId, setCourseId] = useState(profile?.courseId ?? '')
  const [semesterId, setSemesterId] = useState(profile?.semesterId ?? '')
  const [academicYear, setAcademicYear] = useState(String(profile?.academicYear ?? new Date().getFullYear()))
  const [timezone, setTimezone] = useState(profile?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'))
  const [minimumAttendance, setMinimumAttendance] = useState(String(profile?.minimumAttendancePercentage ?? 75))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('21:00')
  const [sessionMinutes, setSessionMinutes] = useState('45')
  const [breakMinutes, setBreakMinutes] = useState('10')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => { void (async () => {
    const [courseResult, semesterResult, subjectResult] = await Promise.all([
      supabase.from('courses').select('id,name'), supabase.from('semesters').select('id,name,course_id'), supabase.from('subjects').select('id,name,course_id,semester_id'),
    ])
    if (!courseResult.error) setCourses(courseResult.data as CatalogRow[])
    if (!semesterResult.error) setSemesters(semesterResult.data as CatalogRow[])
    if (!subjectResult.error) setSubjects(subjectResult.data as CatalogRow[])
  })() }, [])

  const availableSemesters = useMemo(() => semesters.filter((semester) => semester.course_id === courseId), [semesters, courseId])
  const availableSubjects = useMemo(() => subjects.filter((subject) => subject.course_id === courseId && subject.semester_id === semesterId), [subjects, courseId, semesterId])
  function toggleSubject(id: string) { setSelectedSubjects((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) }
  function validateFirstStep() {
    if (fullName.trim().length < 2 || !collegeName.trim() || !courseId || !semesterId) { setMessage('Complete your name, college, course, and semester.'); return false }
    if (!Number.isInteger(Number(academicYear)) || Number(academicYear) < 2000 || Number(academicYear) > 2100) { setMessage('Enter a valid academic year.'); return false }
    if (Number(minimumAttendance) < 0 || Number(minimumAttendance) > 100) { setMessage('Attendance must be between 0 and 100.'); return false }
    return true
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !validateFirstStep()) return
    if (!selectedSubjects.length) { setMessage('Select at least one enrolled subject.'); return }
    setPending(true); setMessage('')
    try {
      const base = { id: user.id, fullName, avatarPath: profile?.avatarPath ?? null, collegeName, courseId, semesterId, academicYear: Number(academicYear), timezone, minimumAttendancePercentage: Number(minimumAttendance) }
      await updateProfile({ ...base, onboardingCompleted: false })
      const { error: enrolmentError } = await supabase.from('student_subjects').upsert(selectedSubjects.map((subjectId) => ({ user_id: user.id, subject_id: subjectId, academic_year: Number(academicYear), enrolment_status: 'active' })), { onConflict: 'user_id,subject_id,academic_year' })
      if (enrolmentError) throw new Error('Your subject enrolments could not be saved.')
      await saveStudyPreferences({ preferredStartTime: startTime, preferredEndTime: endTime, averageSessionMinutes: Number(sessionMinutes), breakMinutes: Number(breakMinutes), preferredDays: [1, 2, 3, 4, 5] })
      await updateProfile({ ...base, onboardingCompleted: true })
      await refreshProfile(); window.location.assign('/dashboard')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Onboarding could not be saved.') } finally { setPending(false) }
  }
  return <ProtectedRoute allowIncomplete><main className="app-page"><section className="onboarding-card"><a className="brand" href="/">CampusFlow</a><p className="eyebrow">Step {step} of 2</p><h1>{step === 1 ? 'Set up your academic profile' : 'Set your study rhythm'}</h1>
    <form onSubmit={submit} className="form-stack">
      {step === 1 ? <><label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label><label>College<input value={collegeName} onChange={(event) => setCollegeName(event.target.value)} required /></label><label>Course<select value={courseId} onChange={(event) => { setCourseId(event.target.value); setSemesterId(''); setSelectedSubjects([]) }} required><option value="">Choose a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label>Semester<select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setSelectedSubjects([]) }} required disabled={!courseId}><option value="">Choose a semester</option>{availableSemesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></label><label>Academic year<input type="number" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} required /></label><label>Minimum attendance (%)<input type="number" min="0" max="100" value={minimumAttendance} onChange={(event) => setMinimumAttendance(event.target.value)} required /></label>{message && <p className="notice error" role="status">{message}</p>}<button type="button" onClick={() => { if (validateFirstStep()) { setMessage(''); setStep(2) } }}>Continue</button></> : <><fieldset><legend>Enrolled subjects</legend>{availableSubjects.map((subject) => <label className="checkbox" key={subject.id}><input type="checkbox" checked={selectedSubjects.includes(subject.id)} onChange={() => toggleSubject(subject.id)} />{subject.name}</label>)}{!availableSubjects.length && <p className="muted">No subjects are available for this selection yet.</p>}</fieldset><label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} required /></label><div className="form-grid"><label>Study from<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label>Study until<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div><div className="form-grid"><label>Session minutes<input type="number" min="15" max="240" value={sessionMinutes} onChange={(event) => setSessionMinutes(event.target.value)} /></label><label>Break minutes<input type="number" min="0" max="60" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} /></label></div>{message && <p className="notice error" role="status">{message}</p>}<div className="button-row"><button type="button" className="secondary" onClick={() => setStep(1)}>Back</button><button disabled={pending} type="submit">{pending ? 'Saving…' : 'Finish setup'}</button></div></>}
    </form></section></main></ProtectedRoute>
}
