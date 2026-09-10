import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useAssignments = (params: Parameters<typeof academicApi.assignments>[0] = {}) => useAcademicQuery((signal) => academicApi.assignments(params, signal), [params.search, params.subject_id, params.status, params.priority, params.sort, params.page])
