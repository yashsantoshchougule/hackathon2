import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useExaminations = (params: Parameters<typeof academicApi.examinations>[0] = {}) => useAcademicQuery((signal) => academicApi.examinations(params, signal), [params.subject_id, params.upcoming, params.page])
