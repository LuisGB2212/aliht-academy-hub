import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Platform, Module, Lesson, UserProgress, CourseProgress } from '@/types/academy-type'
import { apiRepository } from '@/utils/apiRepository'

const PROGRESS_KEY = 'aliht-lms-progress'

export const useLmsStore = defineStore('lms', () => {
  const platforms = ref<Platform[]>([])
  const modules = ref<Module[]>([])
  const lessons = ref<Lesson[]>([])
  const isLoading = ref(false)

  const platformsLoaded = ref(false)
  const modulesLoaded = ref(false)
  const lessonsLoaded = ref(false)

  // --- API ACTIONS ---

  async function fetchPlatforms(force = false) {
    if (platformsLoaded.value && !force) return
    isLoading.value = true
    try {
      const res = await apiRepository.get<Platform[]>({ endpoint: '/academy/platforms' })
      if (res.success) {
        platforms.value = res.data
        platformsLoaded.value = true
      }
    } catch (error) {
      console.error('Error fetching platforms:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchModules(force = false) {
    if (modulesLoaded.value && !force) return
    isLoading.value = true
    try {
      const res = await apiRepository.get<Module[]>({ endpoint: '/academy/modules' })
      if (res.success) {
        modules.value = res.data
        modulesLoaded.value = true
      }
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchLessons(force = false) {
    if (lessonsLoaded.value && !force) return
    isLoading.value = true
    try {
      const res = await apiRepository.get<Lesson[]>({ endpoint: '/academy/lessons' })
      if (res.success) {
        lessons.value = res.data
        lessonsLoaded.value = true
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllData() {
    isLoading.value = true
    try {
      await Promise.all([
        fetchPlatforms(true),
        fetchModules(true),
        fetchLessons(true)
      ])
    } catch (error) {
      console.error('Error fetching academy data:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Specialized fetch for the current platform's content.
   */
  async function fetchPlatformContent(platformId: number) {
    isLoading.value = true
    try {
      const res = await apiRepository.get<Module[]>({ 
        endpoint: `/academy/platforms/${platformId}/content` 
      })
      if (res.success) {
        // When fetching platform content, we receive a nested tree.
        // We'll flatten it to populate the store's primary refs.
        const fetchedModules = res.data
        const fetchedLessons: Lesson[] = []

        fetchedModules.forEach(mod => {
          if (mod.lessons) {
            mod.lessons.forEach((les: any) => {
              fetchedLessons.push(les)
            })
          }
        })

        modules.value = fetchedModules
        lessons.value = fetchedLessons
        
        modulesLoaded.value = true
        lessonsLoaded.value = true
      }
    } catch (error) {
      console.error('Error fetching platform content:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Platforms ---
  async function createPlatform(data: Partial<Platform>) {
    const res = await apiRepository.post<Platform>({ endpoint: '/academy/platforms', body: data })
    if (res.success) {
      platforms.value.push(res.data)
      return res.data
    }
  }

  async function updatePlatform(id: number, data: Partial<Platform>) {
    const res = await apiRepository.put<Platform>({ endpoint: `/academy/platforms/${id}`, body: data })
    if (res.success) {
      const idx = platforms.value.findIndex(p => p.id === id)
      if (idx !== -1) platforms.value[idx] = res.data
      return res.data
    }
  }

  async function deletePlatform(id: number) {
    const res = await apiRepository.delete({ endpoint: `/academy/platforms/${id}` })
    if (res.success) {
      platforms.value = platforms.value.filter(p => p.id !== id)
    }
  }

  // --- Modules ---
  async function createModule(data: any) {
    const res = await apiRepository.post<Module>({ endpoint: '/academy/modules', body: data })
    if (res.success) {
      modules.value.push(res.data)
      return res.data
    }
  }

  async function updateModule(id: number, data: any) {
    const res = await apiRepository.put<Module>({ endpoint: `/academy/modules/${id}`, body: data })
    if (res.success) {
      const idx = modules.value.findIndex(m => m.id === id)
      if (idx !== -1) modules.value[idx] = res.data
      return res.data
    }
  }

  async function deleteModule(id: number) {
    const res = await apiRepository.delete({ endpoint: `/academy/modules/${id}` })
    if (res.success) {
      modules.value = modules.value.filter(m => m.id !== id)
    }
  }

  // --- Lessons ---
  async function createLesson(data: any) {
    const res = await apiRepository.post<Lesson>({ endpoint: '/academy/lessons', body: data })
    if (res.success) {
      lessons.value.push(res.data)
      return res.data
    }
  }

  async function updateLesson(id: number, data: any) {
    const res = await apiRepository.put<Lesson>({ endpoint: `/academy/lessons/${id}`, body: data })
    if (res.success) {
      const idx = lessons.value.findIndex(l => l.id === id)
      if (idx !== -1) lessons.value[idx] = res.data
      return res.data
    }
  }

  async function deleteLesson(id: number) {
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

  function toggleLessonComplete(lessonId: number) {
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

  function markLessonViewed(lessonId: number) {
    const idx = progress.value.findIndex(p => p.lessonId === lessonId)
    if (idx !== -1) {
      progress.value[idx] = { ...progress.value[idx], lastViewedAt: new Date().toISOString() }
    } else {
      progress.value.push({ lessonId, completed: false, lastViewedAt: new Date().toISOString() })
    }
    saveProgress()
  }

  /**
   * Returns lessons associated with a module.
   */
  function getModuleLessons(moduleId: number): Lesson[] {
    return lessons.value.filter(l => 
      l.modules?.some(m => m.id === moduleId) || 
      l.module_ids?.includes(moduleId) ||
      (l as any).pivot?.academy_module_id === moduleId
    ).sort((a, b) => a.order - b.order)
  }

  /**
   * Returns modules associated with a platform.
   */
  function getPlatformModules(platformId: number): Module[] {
    return modules.value.filter(m => 
      m.platforms?.some(p => p.id === platformId) || 
      m.platform_ids?.includes(platformId) ||
      (m as any).pivot?.platform_id === platformId
    ).sort((a, b) => a.order - b.order)
  }

  function getCourseProgress(platformId: number): CourseProgress {
    const platModules = getPlatformModules(platformId)
    const allLessons = platModules.flatMap(m => getModuleLessons(m.id))
    
    // De-duplicate lessons (a lesson can be in multiple modules)
    const uniqueLessons = Array.from(new Map(allLessons.map(l => [l.id, l])).values())

    const completedLessons = uniqueLessons.filter(l =>
      progress.value.find(p => p.lessonId === l.id && p.completed),
    )
    const total = uniqueLessons.length
    const completed = completedLessons.length

    const lastViewed = progress.value
      .filter(p => uniqueLessons.some(l => l.id === p.lessonId) && p.lastViewedAt)
      .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())[0]

    return {
      platformId,
      totalLessons: total,
      completedLessons: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      lastLessonId: lastViewed?.lessonId,
    }
  }

  function getLessonStatus(lessonId: number): 'completed' | 'in_progress' | 'not_started' {
    const p = progress.value.find(pr => pr.lessonId === lessonId)
    if (!p) return 'not_started'
    if (p.completed) return 'completed'
    return 'in_progress'
  }

  async function reorderModules(orders: { id: number; order: number }[]) {
    const res = await apiRepository.post({ endpoint: '/academy/modules/reorder', body: { orders } })
    if (res.success) {
      // Update local state orders if needed, though usually we just refetch or rely on the local sort
      orders.forEach(o => {
        const mod = modules.value.find(m => m.id === o.id)
        if (mod) mod.order = o.order
      })
    }
  }

  async function reorderLessons(orders: { id: number; order: number }[]) {
    const res = await apiRepository.post({ endpoint: '/academy/lessons/reorder', body: { orders } })
    if (res.success) {
      orders.forEach(o => {
        const les = lessons.value.find(l => l.id === o.id)
        if (les) les.order = o.order
      })
    }
  }

  return {
    platforms,
    modules,
    lessons,
    isLoading,
    progress,
    fetchAllData,
    fetchPlatforms,
    fetchModules,
    fetchLessons,
    fetchPlatformContent,
    createPlatform,
    updatePlatform,
    deletePlatform,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderModules,
    reorderLessons,
    toggleLessonComplete,
    markLessonViewed,
    getModuleLessons,
    getPlatformModules,
    getCourseProgress,
    getLessonStatus,
  }
})
