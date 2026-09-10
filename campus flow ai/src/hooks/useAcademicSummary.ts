import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useAcademicSummary = () => useAcademicQuery((signal) => academicApi.summary(signal))
