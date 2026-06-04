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
    AcademyUserProgress,
    ModuleEvaluation,
    EvaluationResult,
    AcademyFolder,
    PracticeSubmission,
} from '@/types/academy-type'
import { apiRepository } from '@/utils/apiRepository'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue3-toastify'

const PROGRESS_KEY          = 'aliht-lms-progress'
const EVAL_RESULTS_KEY      = 'aliht-lms-eval-results'      // { [moduleId]: EvaluationResult }
const PRACTICE_SUB_KEY      = 'aliht-lms-practice-subs'     // { [evalId]: PracticeSubmission }

export const useLmsStore = defineStore('lms', () => {
    // ─── State ─────────────────────────────────────────────────────────────────
    const platforms = ref<Platform[]>([])
    const modules = ref<Module[]>([])
    const lessons = ref<Lesson[]>([])
    const folders = ref<AcademyFolder[]>([])

    // Evaluation results cache: moduleId → EvaluationResult
    const evalResults = ref<Record<number, EvaluationResult>>(
        JSON.parse(localStorage.getItem(EVAL_RESULTS_KEY) ?? '{}')
    )

    // Practice submissions cache: evalId → PracticeSubmission
    const practiceSubmissions = ref<Record<number, PracticeSubmission>>(
        JSON.parse(localStorage.getItem(PRACTICE_SUB_KEY) ?? '{}')
    )

    function _persistEvalResults() {
        localStorage.setItem(EVAL_RESULTS_KEY, JSON.stringify(evalResults.value))
    }
    function _persistPracticeSubs() {
        localStorage.setItem(PRACTICE_SUB_KEY, JSON.stringify(practiceSubmissions.value))
    }

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

    const getPayloadBaseProgress = (): Record<string, any> => {
        const authStore = useAuthStore();

        return {
            user_id: authStore.user?.id,
            user_name: authStore.user?.name,
            user_email: authStore.user?.email,
            agency_id: authStore.user?.agency_id,
            agency_name: authStore.user?.agency_name
        }
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

    // ─── Folder CRUD ──────────────────────────────────────────────────
    async function fetchFolders(force = false) {
        if (!shouldFetch(folders.value, force)) return
        return handleRequest<AcademyFolder[]>(
            'fetchFolders',
            () => apiRepository.get({ endpoint: '/academy/folders' }),
            data => { folders.value = data },
            force
        )
    }

    async function createFolder(data: Partial<AcademyFolder>) {
        return handleRequest<AcademyFolder>(
            'createFolder',
            () => apiRepository.post({ endpoint: '/academy/folders', body: data }),
            res => { 
                folders.value = upsertItem(folders.value, res)
                toast.success('Carpeta creada exitosamente');
            },
            true
        )
    }

    async function updateFolder(id: number, data: Partial<AcademyFolder>) {
        return handleRequest<AcademyFolder>(
            'updateFolder',
            () => apiRepository.put({ endpoint: `/academy/folders/${id}`, body: data }),
            res => { 
                folders.value = upsertItem(folders.value, res)
                toast.success('Carpeta actualizada exitosamente'); 
            },
            true
        )
    }

    async function deleteFolder(id: number) {
        return handleRequest<void>(
            'deleteFolder',
            () => apiRepository.delete({ endpoint: `/academy/folders/${id}` }),
            () => { 
                folders.value = removeItem(folders.value, id)
                toast.success('Carpeta eliminada exitosamente');
            },
            true
        )
    }

    async function reorderFolders(orders: { id: number; order: number }[]) {
        return handleRequest(
            'reorderFolders',
            () => apiRepository.post({ endpoint: '/academy/folders/reorder', body: { orders } }),
            () => {
                orders.forEach(o => {
                    const f = folders.value.find(x => x.id === o.id)
                    if (f) f.order = o.order
                })
                toast.success('Orden de carpetas actualizado exitosamente');
            },
            true
        )
    }

    /** Fetches modules for a specific folder (filtered on the server). */
    async function fetchModulesByFolder(folderId: number) {
        return handleRequest<Module[]>(
            `fetchModulesByFolder-${folderId}`,
            () => apiRepository.get({ endpoint: '/academy/modules', params: { folder_id: folderId } }),
            data => {
                // Merge into the global modules list (upsert each)
                data.forEach(m => { modules.value = upsertItem(modules.value, m) })
            },
            true
        )
    }

    // ─── Platform CRUD ─────────────────────────────────────────────────────────
    async function createPlatform(data: Partial<Platform>) {
        return handleRequest<Platform>(
            'createPlatform',
            () => apiRepository.post({ endpoint: '/academy/platforms', body: data }),
            res => {
                platforms.value = upsertItem(platforms.value, res)
                toast.success('Plataforma creada exitosamente');
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
                toast.success('Plataforma actualizada exitosamente');
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
                toast.success('Plataforma eliminada exitosamente');
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
                toast.success('Módulo creado exitosamente');
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
                toast.success('Módulo actualizado exitosamente');
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
                toast.success('Módulo eliminado exitosamente');
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
                toast.success('Lección creada exitosamente');
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
                toast.success('Lección actualizada exitosamente');
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
                toast.success('Lección eliminada exitosamente');
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
                toast.success('Orden de módulos actualizado exitosamente');
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
                toast.success('Orden de lecciones actualizado exitosamente');
            },
            true
        )
    }

    // ─── Progress ──────────────────────────────────────────────────────────────
    const progress = ref<UserProgress[]>(loadProgress())
    const syncingProgress = ref(false)

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

    // ─── Sync local item to API (fire-and-forget) ──────────────────────────────
    async function syncToApi(lessonId: number, moduleId: number, completed: boolean, lastViewedAt: string) {
        try {
            await apiRepository.post({
                endpoint: '/academy/progress/sync',
                body: { module_id: moduleId, lessons: [{ lessonId, completed, lastViewedAt }], ...getPayloadBaseProgress() },
            })
        } catch (e) {
            console.warn('[LmsStore] sync progress failed (will retry on next visit):', e)
        }
    }

    // ─── Load remote progress and merge with localStorage ─────────────────────
    async function syncProgressFromApi() {
        if (syncingProgress.value) return
        syncingProgress.value = true
        try {
            const res = await apiRepository.get<AcademyUserProgress>({ endpoint: '/academy/progress/me', params: getPayloadBaseProgress() })

            if (!res?.data?.lessons) return

            // Merge: BD tiene prioridad si es más reciente
            for (const remote of res.data.lessons) {
                const local      = progress.value.find(p => p.lessonId === remote.lessonId)
                const remoteTime = remote.lastViewedAt ? new Date(remote.lastViewedAt).getTime() : 0
                const localTime  = local?.lastViewedAt  ? new Date(local.lastViewedAt).getTime()  : 0

                if (!local || remoteTime > localTime) {
                    upsertProgress({
                        lessonId:     remote.lessonId,
                        moduleId:     remote.moduleId,
                        completed:    remote.completed,
                        lastViewedAt: remote.lastViewedAt ?? undefined,
                    })
                }
            }

            for (const evaluation of res.data.evaluations) {
                saveEvalResult(evaluation.moduleId, {
                    score:        evaluation.score,
                    passed:       evaluation.passed,
                    passing_score: evaluation.passingScore,
                    completed_at:  evaluation.completedAt,
                    has_practice_exercise: evaluation.hasPracticeExercise,
                } as EvaluationResult)

                if(evaluation.practice_submission) {
                    practiceSubmissions.value[evaluation.evaluationId] = evaluation.practice_submission
                    _persistPracticeSubs()
                }
            }
        } catch (e) {
            console.warn('[LmsStore] Could not fetch remote progress:', e)
        } finally {
            syncingProgress.value = false
        }
    }

    // ─── Push all local progress to API (útil en primer cargado) ──────────────
    async function pushLocalProgressToApi(moduleId?: number) {
        if (progress.value.length === 0 && !moduleId) return
        try {
            await apiRepository.post({
                endpoint: '/academy/progress/sync',
                body: {
                    module_id: moduleId,
                    lessons: progress.value.map(p => ({
                        lessonId:     p.lessonId,
                        completed:    p.completed,
                        lastViewedAt: p.lastViewedAt ?? new Date().toISOString(),
                    })), ...getPayloadBaseProgress()
                },
            })
        } catch (e) {
            console.warn('[LmsStore] Could not push local progress to API:', e)
        }
    }

    function toggleLessonComplete(lessonId: number, moduleId?: number) {
        const current = progress.value.find(p => p.lessonId === lessonId)
        const now = new Date().toISOString()
        const newCompleted = !current?.completed

        upsertProgress({ lessonId, moduleId, completed: newCompleted, lastViewedAt: now })
        syncToApi(lessonId, moduleId!, newCompleted, now)
    }

    function markLessonViewed(lessonId: number, moduleId: number) {
        const current = progress.value.find(p => p.lessonId === lessonId)
        const now = new Date().toISOString()

        upsertProgress({ lessonId, moduleId, completed: current?.completed ?? false, lastViewedAt: now })
        // Registrar visita en API (fire-and-forget)
        apiRepository.post({ endpoint: `/academy/progress/lesson/${lessonId}/view`, body: {module_id: moduleId, ...getPayloadBaseProgress()} }).catch(() => {})
    }

    // ─── Finalizar módulo ──────────────────────────────────────────────────────
    async function completeModule(moduleId: number) {
        try {
            await apiRepository.post({ endpoint: `/academy/progress/module/${moduleId}/complete`, body: getPayloadBaseProgress() })
        } catch (e) {
            console.warn('[LmsStore] completeModule API call failed:', e)
        }
    }

    // ─── Evaluaciones ──────────────────────────────────────────────────────────

    async function fetchModuleEvaluation(moduleId: number): Promise<ModuleEvaluation | null> {
        try {
            const res = await apiRepository.get<ModuleEvaluation | null>({
                endpoint: `/academy/evaluations/module/${moduleId}`,
                params: getPayloadBaseProgress(),
            })
            return res?.data ?? null
        } catch {
            return null
        }
    }

    async function fetchModuleEvaluationAdmin(moduleId: number): Promise<ModuleEvaluation | null> {
        try {
            const res = await apiRepository.get<ModuleEvaluation | null>({
                endpoint: `/academy/evaluations/module/${moduleId}/admin`,
            })
            return res?.data ?? null
        } catch {
            return null
        }
    }

    async function createEvaluation(data: Partial<ModuleEvaluation>): Promise<ModuleEvaluation | undefined> {
        return handleRequest<ModuleEvaluation>(
            'createEvaluation',
            () => apiRepository.post({ endpoint: '/academy/evaluations', body: data }),
            undefined,
            true
        )
    }

    async function updateEvaluation(id: number, data: Partial<ModuleEvaluation>): Promise<ModuleEvaluation | undefined> {
        return handleRequest<ModuleEvaluation>(
            'updateEvaluation',
            () => apiRepository.put({ endpoint: `/academy/evaluations/${id}`, body: data }),
            undefined,
            true
        )
    }

    async function deleteEvaluation(id: number): Promise<void> {
        await handleRequest<void>(
            'deleteEvaluation',
            () => apiRepository.delete({ endpoint: `/academy/evaluations/${id}` }),
            undefined,
            true
        )
    }

    async function submitEvaluation(evalId: number, answers: Record<string, string[]>): Promise<EvaluationResult | null> {
        try {
            const res = await apiRepository.post<EvaluationResult>({
                endpoint: `/academy/evaluations/${evalId}/submit`,
                body: { answers, ...getPayloadBaseProgress() },
            })
            return res?.data ?? null
        } catch (e) {
            console.warn('[LmsStore] submitEvaluation failed:', e)
            return null
        }
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

    // ─── Module completion (local) ────────────────────────────────────────────
    /**
     * Retorna true si TODAS las lecciones del módulo están completadas localmente.
     * No requiere llamada a API — usa el estado de progress local.
     */
    function isModuleCompleted(moduleId: number): boolean {
        const mods = getModuleLessons(moduleId)
        if (mods.length === 0) return false
        return mods.every(l =>
            progress.value.some(p => p.lessonId === l.id && p.completed)
        )
    }

    // ─── Eval result cache ───────────────────────────────────────────────
    function saveEvalResult(moduleId: number, result: EvaluationResult) {
        evalResults.value[moduleId] = result
        _persistEvalResults()
    }

    function getEvalResult(moduleId: number): EvaluationResult | null {
        return evalResults.value[moduleId] ?? null
    }

    // ─── Practice submission cache ───────────────────────────────────────
    async function submitPracticeFile(
        evalId: number,
        payload: { file_url: string; file_key: string; file_type: string; file_name?: string; module_id?: number }
    ): Promise<PracticeSubmission | null> {
        try {
            const res = await apiRepository.post<PracticeSubmission>({
                endpoint: `/academy/practice/${evalId}/submit`,
                body: { ...payload, ...getPayloadBaseProgress() },
            })
            if (res?.data) {
                practiceSubmissions.value[evalId] = res.data
                _persistPracticeSubs()
                return res.data
            }
            return null
        } catch (e) {
            console.warn('[LmsStore] submitPracticeFile failed:', e)
            return null
        }
    }

    function getPracticeSubmission(evalId: number): PracticeSubmission | null {
        return practiceSubmissions.value[evalId] ?? null
    }

    /**
     * Retorna true cuando el módulo está 100% completado incluyendo evaluación y práctica.
     *
     * Condiciones:
     * 1. Todas las lecciones completadas
     * 2. Si hay evaluación visible con preguntas → debe estar aprobada
     * 3. Si la evaluación tiene practice_exercise → debe haber un archivo subido
     */
    function isModuleTrophyReady(
        moduleId: number,
        evaluation: ModuleEvaluation | null = null
    ): boolean {
        // 1. Lecciones completas
        if (!isModuleCompleted(moduleId)) return false

        // 2. Evaluación (si existe y es visible)
        if (evaluation && evaluation.visible !== false) {
            const hasQuestions = evaluation.questions && evaluation.questions.length > 0
            
            if (hasQuestions) {
                const result = getEvalResult(moduleId)
                if (!result?.passed) return false
            }

            // 3. Practice exercise — basta con que haya un archivo subido
            if (evaluation.practice_exercise) {
                const submission = getPracticeSubmission(evaluation.id)
                if (!submission) return false
            }
        }

        return true
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
        folders,
        progress,
        loading,
        isLoading,
        syncingProgress,

        fetchAllData,
        fetchPlatforms,
        fetchModules,
        fetchLessons,
        fetchPlatformContent,
        fetchFolders,
        fetchModulesByFolder,

        createFolder,
        updateFolder,
        deleteFolder,
        reorderFolders,

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
        completeModule,
        syncProgressFromApi,
        pushLocalProgressToApi,

        fetchModuleEvaluation,
        fetchModuleEvaluationAdmin,
        createEvaluation,
        updateEvaluation,
        deleteEvaluation,
        submitEvaluation,

        // Eval result cache
        saveEvalResult,
        getEvalResult,
        evalResults,

        // Practice submission
        submitPracticeFile,
        getPracticeSubmission,
        practiceSubmissions,

        // Trophy logic
        isModuleTrophyReady,

        getModuleLessons,
        getPlatformModules,
        getCourseProgress,
        getLessonStatus,
        isModuleCompleted,
        getPayloadBaseProgress,
    }
})