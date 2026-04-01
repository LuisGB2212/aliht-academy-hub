export type Company = 'aliht' | 'nextravel' | 'bestravel' | 'todos'

export type ContentType = 'video' | 'pdf' | 'document' | 'link' | 'text'

export type LessonStatus = 'completed' | 'in_progress' | 'locked' | 'not_started'

export interface Category {
  id: string
  name: string
  description: string
  icon: string
  color: string
  order: number
  visibility: Company[]
  published: boolean
  image?: string
}

export interface Module {
  id: string
  categoryId: string
  name: string
  shortDescription: string
  longDescription: string
  order: number
  published: boolean
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  shortDescription: string
  longDescription: string
  contentType: ContentType
  contentUrl?: string
  richTextContent?: string
  order: number
  published: boolean
  duration?: string
}

export interface UserProgress {
  lessonId: string
  completed: boolean
  lastViewedAt?: string
}

export interface CourseProgress {
  categoryId: string
  totalLessons: number
  completedLessons: number
  percentage: number
  lastLessonId?: string
}
