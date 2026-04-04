/**
 * aliht-context-store.ts
 *
 * Refactored:
 * - Removed loaded flags
 * - Safe fetch based on state (length)
 * - Improved handleRequest (no dead locks)
 * - Stable fetchAllData
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
    Platform,
    Module,
    Lesson,
    UserProgress,
    CourseProgress,
    LessonPayload,
} from '@/types/academy-type'
import { apiRepository } from '@/utils/apiRepository'

const PROGRESS_KEY = 'aliht-lms-progress'

export const useLmsStore = defineStore('lms', () => {
    // ─── State ─────────────────────────────────────────────────────────────────
    const platforms = ref<Platform[]>([])
    const modules = ref<Module[]>([])
    const lessons = ref<Lesson[]>([])

    const loading = ref<Record<string, boolean>>({})

    const setLoading = (key: string, value: boolean) => {
        loading.value[key] = value
    }

    const isLoading = computed(() =>
        Object.values(loading.value).some(Boolean)
    )

    function shouldFetch<T>(data: T[], force?: boolean) {
        return force || data.length === 0
    }

    // ─── Generic API Handler ────────────────────────────────────────────────────
    async function handleRequest<T>(
        key: string,
        request: () => Promise<any>,
        onSuccess?: (data: T) => void,
        force = false
    ): Promise<T | undefined> {
        if (loading.value[key] && !force) return

        setLoading(key, true)

        try {
            const res = await request()
            if (res.success) {
                onSuccess?.(res.data)
                return res.data
            }
        } catch (error) {
            console.error(`[LmsStore] ${key}:`, error)
        } finally {
            setLoading(key, false)
        }
    }

    // ─── Fetch ─────────────────────────────────────────────────────────────────
    async function fetchPlatforms(force = false) {
        if (!shouldFetch(platforms.value, force)) return

        return handleRequest<Platform[]>(
            'fetchPlatforms',
            () => apiRepository.get({ endpoint: '/academy/platforms' }),
            data => {
                platforms.value = data
            },
            force
        )
    }

    async function fetchModules(force = false) {
        if (!shouldFetch(modules.value, force)) return

        return handleRequest<Module[]>(
            'fetchModules',
            () => apiRepository.get({ endpoint: '/academy/modules' }),
            data => {
                modules.value = data
            },
            force
        )
    }

    async function fetchLessons(force = false) {
        if (!shouldFetch(lessons.value, force)) return

        return handleRequest<Lesson[]>(
            'fetchLessons',
            () => apiRepository.get({ endpoint: '/academy/lessons' }),
            data => {
                lessons.value = data
            },
            force
        )
    }

    async function fetchAllData(force = false) {
        await Promise.all([
            fetchPlatforms(force),
            fetchModules(force),
            fetchLessons(force),
        ])
    }

    async function fetchPlatformContent(platformId: number) {
        return handleRequest<Module[]>(
            'fetchPlatformContent',
            () =>
                apiRepository.get({
                    endpoint: `/academy/platforms/${platformId}/content`,
                }),
            fetchedModules => {
                const fetchedLessons: Lesson[] = []

                fetchedModules.forEach(mod => {
                    mod.lessons?.forEach(les => fetchedLessons.push(les))
                })

                modules.value = fetchedModules
                lessons.value = fetchedLessons
            },
            true
        )
    }

    // ─── CRUD Helpers ──────────────────────────────────────────────────────────
    function upsertItem<T extends { id: number }>(
        list: T[],
        item: T
    ): T[] {
        const index = list.findIndex(i => i.id === item.id)
        if (index !== -1) {
            const clone = [...list]
            clone[index] = item
            return clone
        }
        return [...list, item]
    }

    function removeItem<T extends { id: number }>(
        list: T[],
        id: number
    ): T[] {
        return list.filter(i => i.id !== id)
    }

    // ─── Platform CRUD ─────────────────────────────────────────────────────────
    async function createPlatform(data: Partial<Platform>) {
        return handleRequest<Platform>(
            'createPlatform',
            () => apiRepository.post({ endpoint: '/academy/platforms', body: data }),
            res => {
                platforms.value = upsertItem(platforms.value, res)
            },
            true
        )
    }

    async function updatePlatform(id: number, data: Partial<Platform>) {
        return handleRequest<Platform>(
            'updatePlatform',
            () => apiRepository.put({ endpoint: `/academy/platforms/${id}`, body: data }),
            res => {
                platforms.value = upsertItem(platforms.value, res)
            },
            true
        )
    }

    async function deletePlatform(id: number) {
        return handleRequest<void>(
            'deletePlatform',
            () => apiRepository.delete({ endpoint: `/academy/platforms/${id}` }),
            () => {
                platforms.value = removeItem(platforms.value, id)
            },
            true
        )
    }

    // ─── Module CRUD ───────────────────────────────────────────────────────────
    async function createModule(data: Partial<Module>) {
        return handleRequest<Module>(
            'createModule',
            () => apiRepository.post({ endpoint: '/academy/modules', body: data }),
            res => {
                modules.value = upsertItem(modules.value, res)
            },
            true
        )
    }

    async function updateModule(id: number, data: Partial<Module>) {
        return handleRequest<Module>(
            'updateModule',
            () => apiRepository.put({ endpoint: `/academy/modules/${id}`, body: data }),
            res => {
                modules.value = upsertItem(modules.value, res)
            },
            true
        )
    }

    async function deleteModule(id: number) {
        return handleRequest<void>(
            'deleteModule',
            () => apiRepository.delete({ endpoint: `/academy/modules/${id}` }),
            () => {
                modules.value = removeItem(modules.value, id)
            },
            true
        )
    }

    // ─── Lesson CRUD ───────────────────────────────────────────────────────────
    async function createLesson(data: LessonPayload) {
        return handleRequest<Lesson>(
            'createLesson',
            () => apiRepository.post({ endpoint: '/academy/lessons', body: data }),
            res => {
                lessons.value = upsertItem(lessons.value, res)
            },
            true
        )
    }

    async function updateLesson(id: number, data: LessonPayload) {
        return handleRequest<Lesson>(
            'updateLesson',
            () => apiRepository.put({ endpoint: `/academy/lessons/${id}`, body: data }),
            res => {
                lessons.value = upsertItem(lessons.value, res)
            },
            true
        )
    }

    async function deleteLesson(id: number) {
        return handleRequest<void>(
            'deleteLesson',
            () => apiRepository.delete({ endpoint: `/academy/lessons/${id}` }),
            () => {
                lessons.value = removeItem(lessons.value, id)
            },
            true
        )
    }

    // ─── Reorder ───────────────────────────────────────────────────────────────
    async function reorderModules(orders: { id: number; order: number }[]) {
        return handleRequest(
            'reorderModules',
            () =>
                apiRepository.post({
                    endpoint: '/academy/modules/reorder',
                    body: { orders },
                }),
            () => {
                orders.forEach(o => {
                    const mod = modules.value.find(m => m.id === o.id)
                    if (mod) mod.order = o.order
                })
            },
            true
        )
    }

    async function reorderLessons(orders: { id: number; order: number }[]) {
        return handleRequest(
            'reorderLessons',
            () =>
                apiRepository.post({
                    endpoint: '/academy/lessons/reorder',
                    body: { orders },
                }),
            () => {
                orders.forEach(o => {
                    const les = lessons.value.find(l => l.id === o.id)
                    if (les) les.order = o.order
                })
            },
            true
        )
    }

    // ─── Progress ──────────────────────────────────────────────────────────────
    const progress = ref<UserProgress[]>(loadProgress())

    function loadProgress(): UserProgress[] {
        try {
            const saved = localStorage.getItem(PROGRESS_KEY)
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    }

    function saveProgress() {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress.value))
    }

    function upsertProgress(item: UserProgress) {
        const index = progress.value.findIndex(p => p.lessonId === item.lessonId)
        if (index !== -1) {
            progress.value[index] = item
        } else {
            progress.value.push(item)
        }
        saveProgress()
    }

    function toggleLessonComplete(lessonId: number) {
        const current = progress.value.find(p => p.lessonId === lessonId)

        upsertProgress({
            lessonId,
            completed: !current?.completed,
            lastViewedAt: new Date().toISOString(),
        })
    }

    function markLessonViewed(lessonId: number) {
        const current = progress.value.find(p => p.lessonId === lessonId)

        upsertProgress({
            lessonId,
            completed: current?.completed ?? false,
            lastViewedAt: new Date().toISOString(),
        })
    }

    // ─── Getters ───────────────────────────────────────────────────────────────
    const getModuleLessons = (moduleId: number): Lesson[] =>
        lessons.value
            .filter(l =>
                l.modules?.some(m => m.id === moduleId) ||
                l.module_ids?.includes(moduleId) ||
                (l as any).pivot?.academy_module_id === moduleId
            )
            .sort((a, b) => a.order - b.order)

    const getPlatformModules = (platformId: number): Module[] =>
        modules.value
            .filter(m =>
                m.platforms?.some(p => p.id === platformId) ||
                m.platform_ids?.includes(platformId) ||
                (m as any).pivot?.platform_id === platformId
            )
            .sort((a, b) => a.order - b.order)

    function getCourseProgress(platformId: number): CourseProgress {
        const platModules = getPlatformModules(platformId)
        const allLessons = platModules.flatMap(m => getModuleLessons(m.id))

        const uniqueLessons = Array.from(
            new Map(allLessons.map(l => [l.id, l])).values()
        )

        const completed = uniqueLessons.filter(l =>
            progress.value.some(p => p.lessonId === l.id && p.completed)
        )

        const lastViewed = [...progress.value]
            .filter(p => uniqueLessons.some(l => l.id === p.lessonId))
            .sort(
                (a, b) =>
                    new Date(b.lastViewedAt || 0).getTime() -
                    new Date(a.lastViewedAt || 0).getTime()
            )[0]

        return {
            platformId,
            totalLessons: uniqueLessons.length,
            completedLessons: completed.length,
            percentage:
                uniqueLessons.length > 0
                    ? Math.round((completed.length / uniqueLessons.length) * 100)
                    : 0,
            lastLessonId: lastViewed?.lessonId,
        }
    }

    const getLessonStatus = (lessonId: number) => {
        const p = progress.value.find(pr => pr.lessonId === lessonId)
        if (!p) return 'not_started'
        return p.completed ? 'completed' : 'in_progress'
    }

    // ─── Expose ────────────────────────────────────────────────────────────────
    return {
        platforms,
        modules,
        lessons,
        progress,
        loading,
        isLoading,

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