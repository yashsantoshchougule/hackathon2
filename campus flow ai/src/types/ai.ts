export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface Citation {
  source_type: string
  source_id: string
  title: string
  route: string
  page_number?: number | null
  section_id?: string | null
  excerpt?: string | null
  updated_at?: string | null
}

export interface SuggestedAction {
  type: 'assignment' | 'attendance' | 'planner' | 'notice' | 'resource' | 'general'
  title: string
  route: string
  source_id?: string | null
  requires_confirmation: boolean
}

export interface AssistantRequest {
  message: string
  conversation_id: string | null
  page_context?: {
    current_route?: string
    selected_subject_id?: string | null
    selected_document_ids?: string[]
  }
}

export interface AssistantResponse {
  conversation_id: string
  message_id: string
  answer: string
  citations: Citation[]
  suggested_actions: SuggestedAction[]
  warnings: string[]
  used_data_types: string[]
  generated_at: string
}

export interface PlanItem {
  id: string
  source_type: 'assignment' | 'examination' | 'recovery' | 'general'
  source_id?: string | null
  title: string
  subject?: string | null
  starts_at: string
  ends_at: string
  priority: PriorityLevel
  reason: string
  completed: boolean
}

export interface StudyPlan {
  id: string
  status: 'pending_confirmation' | 'confirmed' | 'rejected'
  date_from: string
  date_to: string
  items: PlanItem[]
  warnings: string[]
  explanation: string
  recovery_mode: boolean
  created_at: string
}

export interface ExtractedField {
  value: string | string[] | null
  confidence: number
  source_page?: number | null
  source_location?: string | null
  requires_confirmation: boolean
}

export type NoticeFieldKey =
  | 'title'
  | 'issuing_department'
  | 'publication_date'
  | 'deadline'
  | 'applicable_courses'
  | 'applicable_semesters'
  | 'instructions'
  | 'required_documents'
  | 'fees'
  | 'relevant_subjects'
  | 'location'
  | 'contact_information'
  | 'required_student_actions'

export type NoticeFields = Record<NoticeFieldKey, ExtractedField>

export interface NoticeExtraction {
  id: string
  notice_id: string
  document_id: string
  document_title: string
  status: 'review_required' | 'confirmed' | 'rejected'
  fields: NoticeFields
  warnings: string[]
  original_document_route: string
  created_at: string
}

export type CopilotMode = 'answer' | 'simpler' | 'practice' | 'revision'

export interface CopilotResponse {
  answer: string
  citations: Citation[]
  sufficient_evidence: boolean
  warnings: string[]
  generated_at: string
}

export interface DocumentSummary {
  id: string
  title: string
  subject_id?: string | null
  processing_status: string
  updated_at?: string | null
}

export interface DocumentUploadResponse {
  document_id: string
  title: string
  processing_status: 'processed'
  page_count: number
  chunk_count: number
  resource_route: string
}

export interface PriorityResult {
  task_id: string
  title: string
  recommended_action: string
  priority: PriorityLevel
  score: number
  reason: string
  source_data_considered: string[]
  deadline?: string | null
  estimated_minutes?: number | null
  consequence_of_delay: string
  missing_data_warning?: string | null
  route: string
}

export interface DashboardSummary {
  next_action: {
    title: string
    reason: string
    priority: PriorityLevel
    estimated_minutes?: number | null
    source_ids: string[]
    route: string
  } | null
  risks: PriorityResult[]
  plan_progress: { completed_items: number; total_items: number }
  notifications: Array<{
    notification_type: 'academic_risk' | 'deadline' | 'attendance' | 'study_plan'
    source_entity_id: string
    message: string
    severity: PriorityLevel
    destination_route: string
  }>
  warnings: string[]
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; request_id?: string }
}
