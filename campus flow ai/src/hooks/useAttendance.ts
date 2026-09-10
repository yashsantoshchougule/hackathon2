import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useAttendance = () => useAcademicQuery((signal) => academicApi.attendance(signal))
