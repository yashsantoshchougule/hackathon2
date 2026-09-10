import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useReminders = (params: Parameters<typeof academicApi.reminders>[0] = {}) => useAcademicQuery((signal) => academicApi.reminders(params, signal), [params.status, params.page])
