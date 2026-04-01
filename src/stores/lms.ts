import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, Module, Lesson, UserProgress, CourseProgress } from '@/types/lms'
import {
  categories as initialCategories,
  modules as initialModules,
  lessons as initialLessons,
} from '@/data/mockData'

const PROGRESS_KEY = 'aliht-lms-progress'

export const useLmsStore = defineStore('lms', () => {
  const categories = ref<Category[]>(initialCategories)
  const modules = ref<Module[]>(initialModules)
  const lessons = ref<Lesson[]>(initialLessons)

  const progress = ref<UserProgress[]>((() => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })())

  function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress.value))
  }

  function toggleLessonComplete(lessonId: string) {
    const idx = progress.value.findIndex(p => p.lessonId === lessonId)
    if (idx !== -1) {
      progress.value[idx] = {
        ...progress.value[idx],
        completed: !progress.value[idx].completed,
        lastViewedAt: new Date().toISOString(),
      }
    } else {
      progress.value.push({ lessonId, completed: true, lastViewedAt: new Date().toISOString() })
    }
    saveProgress()
  }

  function markLessonViewed(lessonId: string) {
    const idx = progress.value.findIndex(p => p.lessonId === lessonId)
    if (idx !== -1) {
      progress.value[idx] = { ...progress.value[idx], lastViewedAt: new Date().toISOString() }
    } else {
      progress.value.push({ lessonId, completed: false, lastViewedAt: new Date().toISOString() })
    }
    saveProgress()
  }

  function getModuleLessons(moduleId: string): Lesson[] {
    return lessons.value
      .filter(l => l.moduleId === moduleId && l.published)
      .sort((a, b) => a.order - b.order)
  }

  function getCategoryModules(categoryId: string): Module[] {
    return modules.value
      .filter(m => m.categoryId === categoryId && m.published)
      .sort((a, b) => a.order - b.order)
  }

  function getCourseProgress(categoryId: string): CourseProgress {
    const catModules = getCategoryModules(categoryId)
    const allLessons = catModules.flatMap(m => getModuleLessons(m.id))
    const completedLessons = allLessons.filter(l =>
      progress.value.find(p => p.lessonId === l.id && p.completed),
    )
    const total = allLessons.length
    const completed = completedLessons.length

    const lastViewed = progress.value
      .filter(p => allLessons.some(l => l.id === p.lessonId) && p.lastViewedAt)
      .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())[0]

    return {
      categoryId,
      totalLessons: total,
      completedLessons: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      lastLessonId: lastViewed?.lessonId,
    }
  }

  function getLastViewedLesson(categoryId: string): string | undefined {
    return getCourseProgress(categoryId).lastLessonId
  }

  function getLessonStatus(lessonId: string): 'completed' | 'in_progress' | 'not_started' {
    const p = progress.value.find(pr => pr.lessonId === lessonId)
    if (!p) return 'not_started'
    if (p.completed) return 'completed'
    return 'in_progress'
  }

  return {
    categories,
    modules,
    lessons,
    progress,
    toggleLessonComplete,
    markLessonViewed,
    getModuleLessons,
    getCategoryModules,
    getCourseProgress,
    getLastViewedLesson,
    getLessonStatus,
  }
})
