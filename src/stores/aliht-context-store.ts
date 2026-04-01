import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import type { Category, Module, Lesson, UserProgress, CourseProgress } from '@/types/academy-type'
import { apiRepository } from '@/utils/apiRepository'

const PROGRESS_KEY = 'aliht-lms-progress'

export const useLmsStore = defineStore('lms', () => {
  const categories = ref<Category[]>([])
  const modules = ref<Module[]>([])
  const lessons = ref<Lesson[]>([])
  const isLoading = ref(false)

  // --- API ACTIONS ---

  async function fetchAllData() {
    isLoading.value = true
    try {
      const [catRes, modRes, lesRes] = await Promise.all([
        apiRepository.get<Category[]>({ endpoint: '/academy/categories' }),
        apiRepository.get<Module[]>({ endpoint: '/academy/modules' }),
        apiRepository.get<Lesson[]>({ endpoint: '/academy/lessons' })
      ])

      if (catRes.success) categories.value = catRes.data
      if (modRes.success) modules.value = modRes.data
      if (lesRes.success) lessons.value = lesRes.data
    } catch (error) {
      console.error('Error fetching academy data:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Categories ---
  async function createCategory(data: Partial<Category>) {
    const res = await apiRepository.post<Category>({ endpoint: '/academy/categories', body: data })
    if (res.success) {
      categories.value.push(res.data)
      return res.data
    }
  }

  async function updateCategory(id: string, data: Partial<Category>) {
    const res = await apiRepository.put<Category>({ endpoint: `/academy/categories/${id}`, body: data })
    if (res.success) {
      const idx = categories.value.findIndex(c => c.id === id)
      if (idx !== -1) categories.value[idx] = res.data
      return res.data
    }
  }

  async function deleteCategory(id: string) {
    const res = await apiRepository.delete({ endpoint: `/academy/categories/${id}` })
    if (res.success) {
      categories.value = categories.value.filter(c => c.id !== id)
    }
  }

  // --- Modules ---
  async function createModule(data: Partial<Module>) {
    const res = await apiRepository.post<Module>({ endpoint: '/academy/modules', body: data })
    if (res.success) {
      modules.value.push(res.data)
      return res.data
    }
  }

  async function updateModule(id: string, data: Partial<Module>) {
    const res = await apiRepository.put<Module>({ endpoint: `/academy/modules/${id}`, body: data })
    if (res.success) {
      const idx = modules.value.findIndex(m => m.id === id)
      if (idx !== -1) modules.value[idx] = res.data
      return res.data
    }
  }

  async function deleteModule(id: string) {
    const res = await apiRepository.delete({ endpoint: `/academy/modules/${id}` })
    if (res.success) {
      modules.value = modules.value.filter(m => m.id !== id)
    }
  }

  // --- Lessons ---
  async function createLesson(data: Partial<Lesson>) {
    const res = await apiRepository.post<Lesson>({ endpoint: '/academy/lessons', body: data })
    if (res.success) {
      lessons.value.push(res.data)
      return res.data
    }
  }

  async function updateLesson(id: string, data: Partial<Lesson>) {
    const res = await apiRepository.put<Lesson>({ endpoint: `/academy/lessons/${id}`, body: data })
    if (res.success) {
      const idx = lessons.value.findIndex(l => l.id === id)
      if (idx !== -1) lessons.value[idx] = res.data
      return res.data
    }
  }

  async function deleteLesson(id: string) {
    const res = await apiRepository.delete({ endpoint: `/academy/lessons/${id}` })
    if (res.success) {
      lessons.value = lessons.value.filter(l => l.id !== id)
    }
  }

  // --- PROGRESS LOGIC (Local) ---

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
    isLoading,
    progress,
    fetchAllData,
    createCategory,
    updateCategory,
    deleteCategory,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
    toggleLessonComplete,
    markLessonViewed,
    getModuleLessons,
    getCategoryModules,
    getCourseProgress,
    getLastViewedLesson,
    getLessonStatus,
  }
})
