export type ContentType = 'video' | 'pdf' | 'document' | 'link' | 'text' | 'mixed'

export type LessonStatus = 'completed' | 'in_progress' | 'locked' | 'not_started'

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
  platforms?: Platform[] // For display
  platform_ids?: number[] // For saving
  lessons?: Lesson[] // For nested content tree
  created_at?: string
  updated_at?: string
}

export interface LessonPlatformContent {
  id?: number
  platform_id: number
  type: string
  title?: string
  content: any // JSON
  order: number
  visible: boolean
}

export interface Lesson {
  id: number
  title: string
  description?: string
  type_content: string
  order: number
  visible: boolean
  modules?: Module[] // For display
  module_ids?: number[] // For saving
  platform_contents: LessonPlatformContent[]
  created_at?: string
  updated_at?: string
}

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
