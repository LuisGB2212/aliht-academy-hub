// ─── Content type ─────────────────────────────────────────────────────────────

export type ContentType = 'video' | 'pdf' | 'link' | 'text'

/** Upload category sent to the pre-signed URL endpoint */
export type UploadCategory = 'video' | 'pdf' | 'image'

export type LessonStatus = 'completed' | 'in_progress' | 'locked' | 'not_started'

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
  platforms?: Platform[]   // populated on fetch (display)
  platform_ids?: number[]  // used when saving
  lessons?: Lesson[]       // nested content tree
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
}