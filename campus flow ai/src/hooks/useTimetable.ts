import { academicApi } from '../services/academicApi'; import { useAcademicQuery } from './useAcademicQuery'
export const useTimetable = (params: Parameters<typeof academicApi.timetable>[0] = {}) => useAcademicQuery((signal) => academicApi.timetable(params, signal), [params.from, params.to, params.view])
