import { createContext } from 'react'
import type { AuthContextValue } from '../types/auth'

export const authContext = createContext<AuthContextValue | undefined>(undefined)
