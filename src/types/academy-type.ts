// ─── Content type ─────────────────────────────────────────────────────────────

export type ContentType = 'video' | 'pdf' | 'image' | 'link' | 'text'

/** Upload category sent to the pre-signed URL endpoint */
export type UploadCategory = 'video' | 'pdf' | 'image' | 'practice'

export type LessonStatus = 'completed' | 'in_progress' | 'locked' | 'not_started'

// ─── Upload state per platform content slot ───────────────────────────────────
export interface PlatformContentUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

// ─── Typed content value stored in DB ────────────────────────────────────────

/**
 * The JSON structure stored in `academy_lesson_platform_contents.content`.
 * - `value`    → CDN URL (for video/pdf/link) or plain text (for text type)
 * - `file_key` → S3 object key, stored for future reference (video/pdf only)
 */
export interface PlatformContentValue {
    value: string
    file_key?: string
}

// ─── API response types ───────────────────────────────────────────────────────

/** Response from POST /academy/upload/presigned-url */
export interface PresignedUrlResponse {
    upload_url: {
        url: string
    }
    public_url: string
    key: string
}

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Platform {
    id: number
    name: string
    color?: string
    image_url?: string
    description?: string
    visible: boolean
    created_at?: string
    updated_at?: string
}

export interface Module {
    id: number
    name: string
    description?: string
    order: number
    visible: boolean
    folder_id?: number        // carpeta a la que pertenece
    platforms?: Platform[]   // populated on fetch (display)
    platform_ids?: number[]  // used when saving
    profile_ids?: number[]   // hardcoded profile IDs
    lessons?: Lesson[]       // nested content tree
    evaluation?: ModuleEvaluation
    pivot?: {
        academy_lesson_id: number
        academy_module_id: number
    }
    created_at?: string
    updated_at?: string
}

export interface LessonPlatformContent {
    id?: number
    platform_id: number
    type: ContentType
    title?: string
    content: PlatformContentValue
    order: number
    visible: boolean
}

export interface Lesson {
    id: number
    title: string
    description?: string
    type_content: ContentType
    order: number
    visible: boolean
    modules?: Module[]              // populated on fetch (display)
    module_ids?: number[]           // used when saving
    platform_contents: LessonPlatformContent[]
    created_at?: string
    updated_at?: string
}

// ─── Progress tracking (local) ────────────────────────────────────────────────

export interface UserProgress {
    lessonId: number
    completed: boolean
    moduleId?: number
    lastViewedAt?: string
}

export interface CourseProgress {
    platformId: number
    totalLessons: number
    completedLessons: number
    percentage: number
    lastLessonId?: number
}

export interface LessonPayload extends Omit<Partial<Lesson>, 'modules' | 'platform_contents'> {
    modules_ids?: number[]
    platform_contents?: Partial<LessonPlatformContent>[]
}

export interface User {
    id: number;
    email: string;
    name: string;
    is_aliht: boolean;
    agency_id: number;
    agency_name: string;
    view_stats?: boolean;
}

export interface AcademyUserProgress {
    lessons: { lessonId: number; moduleId: number; completed: boolean; lastViewedAt: string | null }[]
    modules: { moduleId: number; completedAt: string }[],
    evaluations: {evaluationId: number, moduleId: number, score: number, passed: boolean, passingScore: number, hasPracticeExercise: boolean, practice_submission?: PracticeSubmission, completedAt: string}[]
}

export interface AcademyStatistics {
    total_modules: number;
    total_lessons: number;
    total_completed_modules: number;
    total_completed_lessons: number;
    completion_percentage: number;
    users_with_progress: number;
    users_with_zero_progress: number;
}

export interface TopUserLesson {
    lesson_id: number;
    lesson_title: string;
    module_id: number;
}

export interface TopUserStat {
    user_id: number;
    user_name: string;
    user_email: string;
    agency_id: number;
    agency_name: string;
    total_completed: number;
    module_id: number;
    // actual_module_id?: number;
    module_name?: string;
    module_lessons_total?: number;
    lessons: TopUserLesson[];
    has_evaluation?: boolean;
    evaluation_id?: number | null;
    has_evaluation_result?: boolean;
    evaluation_score?: number | null;
    evaluation_passed?: boolean | null;
}

export interface ModuleCompletion {
    module: string;
    module_id: number;
    total_users: number;
    total_agencies: number;
}

export interface TopLessonStat {
    lesson: string;
    lesson_id: number;
    total_completed: number;
}

export interface AgencyStat {
    agency_id: number;
    agency_name: string;
    users_with_progress: number;
    total_completions: number;
}

export interface AcademyPlatformStatistics {
    top_users: TopUserStat[];
    module_completions: ModuleCompletion[];
    top_lessons: TopLessonStat[];
    by_agency: AgencyStat[];
}

// ─── Folders ───────────────────────────────────────────────────────

export interface AcademyFolder {
    id: number
    name: string
    order: number
    modules_count?: number
    created_at?: string
    updated_at?: string
}

// ─── Evaluations ──────────────────────────────────────────────────

export type EvaluationQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open_answer'

// ─── Profiles (hardcoded, no DB table yet) ─────────────────────────────

export interface AcademyProfile {
    id: number
    name: string
}

export const ACADEMY_PROFILES: AcademyProfile[] = [
    { id: 1, name: 'Gerente' },
    { id: 2, name: 'Agente de Viaje' },
    { id: 3, name: 'Finanzas' },
    { id: 4, name: 'Recepción' },
    { id: 5, name: 'Sistemas' },
    { id: 6, name: 'Operaciones' },
]

export interface EvaluationOption {
    id: string
    text: string
    correct?: boolean // solo presente en vista admin
}

export interface EvaluationQuestion {
    id: string
    question: string
    type: EvaluationQuestionType
    options: EvaluationOption[]
    expected_answer?: string  // solo para tipo open_answer, visible solo en admin
    weight?: number           // porcentaje de calificación (0-100); null = auto
}

export interface ModuleEvaluation {
    id: number
    module_id: number
    title: string
    description?: string
    practice_exercise?: string
    passing_score: number
    questions: EvaluationQuestion[]
    visible?: boolean
}

export interface EvaluationResult {
    score: number
    passed: boolean
    passing_score: number
    completed_at: string
    // Practice exercise context (set after submit if evaluation has practice_exercise)
    has_practice_exercise?: boolean
}

// Submission de ejercicio práctico (archivo subido a S3)
export type PracticeSubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface PracticeSubmission {
    id: number
    status: PracticeSubmissionStatus
    file_url: string
    file_type: string
    file_name?: string
    reviewer_note?: string
    created_at: string
    review_metadata?: {
        user_id?: number;
        user_name?: string;
        agency_id?: number;
        score?: number;
    }
}

export interface EvaluationResultResponse {
    id: number
    agency_id: number
    agency_name?: string
    completed_at: string
    passed: boolean
    score: number
    user_id: number
    user_name: string
    user_email: string
    answers?: Record<string, string[]>,
    evaluation?: ModuleEvaluation,
}