<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { useAuthStore } from '@/stores/auth'
import type { AcademyFolder, PlatformContentUploadState } from '@/types/academy-type'
import {
    CheckCircle2, Circle, PlayCircle, FileText,
    Link as LinkIcon, Type, ChevronDown, ArrowRight,
    Monitor, BarChart3, Trophy, Folder, FolderOpen,
    ChevronRight, ArrowLeft, Upload, Loader2, ClipboardList,
    AlertCircle
} from 'lucide-vue-next'
import EvaluationModal from '@/components/EvaluationModal.vue'
import { uploadAcademyFile } from '@/utils/uploadUtils'

const route  = useRoute()
const router = useRouter()
const store  = useLmsStore()
const authStore = useAuthStore()

const platformId = computed(() => parseInt(route.params.categoryId as string))
const platform   = computed(() => store.platforms.find(p => p.id === platformId.value))
const prog       = computed(() => platform.value ? store.getCourseProgress(platform.value.id) : null)
const loading    = ref(false)

// ─── URL-synced folder ─────────────────────────────────────────────────────
const selectedFolderId = computed<number | null>({
    get: () => route.query.folder !== undefined ? Number(route.query.folder) : null,
    set: (v) => router.replace({ query: { ...route.query, folder: v ?? undefined } }),
})

const GENERAL_FOLDER_ID = 0   // virtual id for modules without folder

function enterFolder(id: number) {
    router.replace({ query: { ...route.query, folder: id } })
}
function goBack() {
    const q = { ...route.query }
    delete q.folder
    router.replace({ query: q })
}

// ─── Folders ───────────────────────────────────────────────────────────────
const allPlatformModules = computed(() =>
    platform.value ? store.getPlatformModules(platform.value.id) : []
)

// Build folder list: real folders + "General" for uncategorized
const foldersWithModules = computed(() => {
    const real = store.folders.filter(f =>
        allPlatformModules.value.some(m => m.folder_id === f.id)
    ).map(f => ({
        ...f,
        moduleCount: allPlatformModules.value.filter(m => m.folder_id === f.id).length,
        isGeneral: false,
    }))

    const uncategorized = allPlatformModules.value.filter(m => !m.folder_id)
    const list = [...real]
    if (uncategorized.length > 0) {
        list.push({ id: GENERAL_FOLDER_ID, name: 'General', order: 999, moduleCount: uncategorized.length, isGeneral: true } as any)
    }
    return list
})

// Modules for current folder view
const currentFolderModules = computed(() => {
    if (selectedFolderId.value === null) return []
    if (selectedFolderId.value === GENERAL_FOLDER_ID) {
        return allPlatformModules.value.filter(m => !m.folder_id)
    }
    return allPlatformModules.value.filter(m => m.folder_id === selectedFolderId.value)
})

const currentFolder = computed((): AcademyFolder | { id: number; name: string } | null => {
    if (selectedFolderId.value === null) return null
    if (selectedFolderId.value === GENERAL_FOLDER_ID) return { id: 0, name: 'General' }
    return store.folders.find(f => f.id === selectedFolderId.value) ?? null
})

// ─── Module accordion ──────────────────────────────────────────────────────
const openModules = ref<Set<number>>(new Set())

// watch(currentFolderModules, (mods) => {
//     if (openModules.value.size === 0 && mods.length > 0) {
//         openModules.value = new Set(mods.map(m => m.id))
//     }
// }, { immediate: true })

function toggleModule(modId: number) {
    const next = new Set(openModules.value)
    if (next.has(modId)) next.delete(modId)
    else next.add(modId)
    openModules.value = next
}

const contentIcons: Record<string, any> = {
    video: PlayCircle, pdf: FileText, link: LinkIcon, text: Type,
}


// ─── Trophy ────────────────────────────────────────────────────────────────
function isTrophyReady(moduleId: number): boolean {
    return store.isModuleTrophyReady(moduleId, store.modules.find((m: any) => m.id === moduleId)?.evaluation)
}

// ─── Module state machine ──────────────────────────────────────────────────
type ModuleState = 'lessons' | 'needs_eval' | 'needs_practice' | 'needs_review' | 'complete'

function getModuleState(moduleId: number): ModuleState {
    if (!store.isModuleCompleted(moduleId)) return 'lessons'
    const ev = store.modules.find((m: any) => m.id === moduleId)?.evaluation

    
    if (!ev || ev.visible === false) return 'complete'
    
    const hasQuestions = ev.questions && ev.questions.length > 0
    const result = store.getEvalResult(moduleId)

    if (hasQuestions && !result?.passed) return 'needs_eval'

    if (ev.practice_exercise) {
        const sub = store.getPracticeSubmission(ev.id)
        if (!sub) return 'needs_practice'
        if(sub.status !== 'approved') return 'needs_review'
    }
    return 'complete'
}

// ─── Evaluation Modal ──────────────────────────────────────────────────────
const activeEvalModuleId = ref<number | null>(null)
const activeEval = computed(() =>
    activeEvalModuleId.value !== null ? store.modules.find((m: any) => m.id === activeEvalModuleId.value)?.evaluation : null
)

function openEval(moduleId: number) {
    activeEvalModuleId.value = moduleId
}
function closeEval() {
    activeEvalModuleId.value = null
}
async function onEvalPassed() {
    closeEval()
    store.syncProgressFromApi();
}

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.mp4,.mov,.webm'

// ─── Inline Practice Upload ────────────────────────────────────────────────
const practiceFile    = ref<Record<number, File | null>>({})
const practiceError   = ref<Record<number, string>>({})
const uploadStates = ref<Record<number, PlatformContentUploadState>>({})

function onPracticeFileSelected(moduleId: number, e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null
    practiceFile.value[moduleId] = f
    practiceError.value[moduleId] = ''
}

async function handlePracticeUpload(moduleId: number) {
    const ev   = store.modules.find((m: any) => m.id === moduleId)?.evaluation
    const file = practiceFile.value[moduleId]
    if (!ev || !file) return

    practiceError.value[moduleId] = ''

    try {
        const { publicUrl, key } = await uploadAcademyFile(file, 'practice', (progress) => {
            uploadStates.value[moduleId] = { ...uploadStates.value[moduleId], progress }
        })

        await store.submitPracticeFile(ev.id, {
            file_url: publicUrl, file_key: key, file_type: file.type,
            file_name: file.name, module_id: moduleId,
        })

        store.syncProgressFromApi();
        
    } catch (error: any) {
        console.error(error)
        practiceError.value[moduleId] = (error instanceof Error) ? error.message : 'Error inesperado. Intenta de nuevo.'
    } finally {
        uploadStates.value[moduleId].isUploading = false
    }
}

// ─── Mount ─────────────────────────────────────────────────────────────────
onMounted(async () => {
    loading.value = true
    await store.fetchPlatforms()
    await store.fetchFolders()
    if (platformId.value) {
        await store.fetchPlatformContent(platformId.value)
    }

    store.syncProgressFromApi()

    loading.value = false
})
</script>

<template>
<div v-if="platform && !loading" class="w-full px-4 py-8 md:px-6">

    <!-- Header -->
    <div class="relative bg-card rounded-2xl p-4 md:p-10 md:py-6 mb-10 shadow-xs overflow-hidden border border-border/30">
        <div class="absolute -top-20 -right-20 w-52 h-52 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

        <div class="relative z-10">
            <div class="flex items-center justify-between">
                <div class="w-1/2">
                    <span class="text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-2 block">Academia Corporativa</span>
                    <h1 class="text-2xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
                        Portal <span class="gradient-text">{{ platform.name }}</span>
                    </h1>
                    <p class="text-muted-foreground text-sm md:text-base max-w-3xl leading-relaxed mb-4">
                        {{ platform.description || 'Bienvenido al centro de capacitación de ' + platform.name + '.' }}
                    </p>
                    <div v-if="authStore.user?.agency_id && authStore.user?.view_stats" class="mb-4">
                        <RouterLink to="/agency-stats" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-primary bg-primary/10 hover:bg-primary/20">
                            <BarChart3 class="w-4 h-4" /> Ver Estadísticas de Agencia
                        </RouterLink>
                    </div>
                    <hr class="mt-4">
                </div>
                <div class="mr-6" :class="platform.name.toLowerCase() == 'nextravel' ? 'w-64 p-3' : 'w-72'">
                    <img v-if="platform.image_url" :src="platform.image_url" :alt="platform.name" class="w-80 h-auto">
                </div>
            </div>

            <!-- Stats -->
            <div class="grid md:grid-cols-3 gap-6 items-center">
                <div class="col-span-2">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs text-muted-foreground font-semibold">Progreso del curso</span>
                        <span class="text-xs font-bold text-foreground">{{ prog?.percentage }}%</span>
                    </div>
                    <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div class="h-full gradient-bg transition-all duration-700 ease-out" :style="`width: ${prog?.percentage}%`"></div>
                    </div>
                </div>
                <div class="flex items-center justify-between md:justify-end gap-6 md:gap-10">
                    <div class="text-center">
                        <p class="text-[11px] text-muted-foreground font-medium">Tutoriales</p>
                        <p class="text-lg font-bold text-foreground">{{ prog?.totalLessons }}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[11px] text-muted-foreground font-medium">Completadas</p>
                        <p class="text-lg font-bold text-success">{{ prog?.completedLessons }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ FOLDER LIST view ════════════════════════════════════════════════ -->
    <template v-if="selectedFolderId === null">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="folder in foldersWithModules" :key="folder.id"
                class="group flex flex-col bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                @click="enterFolder(folder.id)">

                <div class="flex items-start gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                        <Folder class="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-foreground truncate">{{ folder.name }}</h3>
                        <p class="text-xs text-muted-foreground mt-0.5">{{ (folder as any).moduleCount }} módulos</p>
                    </div>
                </div>

                <div class="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                    <span class="text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Ver módulos <ChevronRight class="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>

            <div v-if="foldersWithModules.length === 0"
                class="col-span-full text-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                <Folder class="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p class="text-muted-foreground">No hay contenido disponible aún.</p>
            </div>
        </div>
    </template>

    <!-- ═══ MODULE LIST view ════════════════════════════════════════════════ -->
    <template v-else>
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 mb-6">
            <button @click="goBack"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <ArrowLeft class="w-4 h-4" /> Módulos
            </button>
            <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
            <div class="flex items-center gap-2">
                <FolderOpen class="w-4 h-4 text-primary" />
                <span class="text-sm font-bold text-foreground">{{ currentFolder?.name }}</span>
            </div>
        </div>

        <!-- Module cards -->
        <div class="space-y-4">
            <div v-for="(mod, modIndex) in currentFolderModules" :key="mod.id"
                class="group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">

                <!-- Module header -->
                <button @click="toggleModule(mod.id)"
                    class="w-full flex items-center justify-between p-5 md:p-6 text-left transition-colors hover:bg-muted/30">
                    <div class="flex items-center gap-4">
                        <div class="w-11 h-11 rounded-xl gradient-bg text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md shrink-0">
                            {{ modIndex + 1 }}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="font-semibold text-foreground text-sm md:text-base uppercase tracking-tight">{{ mod.name }}</h3>
                                <!-- Trophy -->
                                <Transition name="trophy-pop">
                                    <div>
                                        <span v-if="isTrophyReady(mod.id) && getModuleState(mod.id) === 'needs_review'" class="inline-flex items-center text-orange-500 text-sm" title="¡Módulo en revisión!">
                                            <AlertCircle class="w-4 h-4 text-orange-500 mr-2" /> Enviado para revisión
                                        </span>
                                        <span v-if="isTrophyReady(mod.id) && getModuleState(mod.id) === 'complete'" class="inline-flex items-center text-amber-500" title="¡Módulo completado!">
                                            <Trophy class="w-4 h-4 fill-amber-400 text-amber-500" /> {{ store.getEvalResult(mod.id)?.score }}% / 100%
                                        </span>
                                    </div>
                                </Transition>
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ store.getModuleLessons(mod.id).filter(l => store.getLessonStatus(l.id) === 'completed').length }}
                                / {{ store.getModuleLessons(mod.id).length }} completadas
                            </p>
                        </div>
                    </div>
                    <ChevronDown class="w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0"
                        :class="openModules.has(mod.id) ? 'rotate-180 text-primary' : ''" />
                </button>

                <!-- Expanded content -->
                <Transition name="fade-slide">
                    <div v-if="openModules.has(mod.id)" class="border-t border-border/50">

                        <!-- ① Normal: lessons list -->
                        <template v-if="getModuleState(mod.id) === 'lessons' || !store.isModuleCompleted(mod.id)">
                            <div class="bg-muted/10 divide-y divide-border/40">
                                <RouterLink v-for="lesson in store.getModuleLessons(mod.id)" :key="lesson.id"
                                    :to="{ name: 'lesson', params: { categoryId: platformId, lessonId: lesson.id } }"
                                    class="flex items-center gap-4 px-5 md:px-6 py-4 group/item transition-all hover:bg-muted">
                                    <div class="shrink-0">
                                        <CheckCircle2 v-if="store.getLessonStatus(lesson.id) === 'completed'" class="w-5 h-5 text-success" />
                                        <PlayCircle   v-else-if="store.getLessonStatus(lesson.id) === 'in_progress'" class="w-5 h-5 text-primary" />
                                        <Circle       v-else class="w-5 h-5 text-muted-foreground opacity-30" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <component :is="contentIcons[lesson.type_content] || FileText" class="w-4 h-4 text-muted-foreground opacity-60" />
                                            <p class="text-sm md:text-[15px] font-semibold truncate transition-colors"
                                                :class="store.getLessonStatus(lesson.id) === 'completed' ? 'text-muted-foreground' : 'text-foreground group-hover/item:text-primary'">
                                                {{ lesson.title }}
                                            </p>
                                        </div>
                                        <p class="text-xs text-muted-foreground truncate opacity-80">{{ lesson.description || 'Sin descripción' }}</p>
                                    </div>
                                    <ArrowRight class="w-5 h-5 text-primary opacity-0 translate-x-[-8px] transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                                </RouterLink>
                            </div>
                        </template>

                        <!-- ② Needs evaluation -->
                        <template v-else-if="getModuleState(mod.id) === 'needs_eval'">
                            <div class="p-6 flex items-center justify-between gap-4 bg-primary/5">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                                        <ClipboardList class="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-foreground">¡Lecciones completadas!</p>
                                        <p class="text-xs text-muted-foreground">Realiza la evaluación final para obtener tu trofeo.</p>
                                    </div>
                                </div>
                                <button @click.stop="openEval(mod.id)"
                                    class="shrink-0 flex items-center gap-2 px-5 py-2.5 gradient-bg text-primary-foreground text-sm font-bold rounded-xl shadow-md hover:scale-105 transition-transform">
                                    <ClipboardList class="w-4 h-4" /> Iniciar evaluación
                                </button>
                            </div>
                        </template>

                        <!-- ③ Needs practice file upload -->
                        <template v-else-if="getModuleState(mod.id) === 'needs_practice'">
                            <div class="p-5 bg-primary/5">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                                        <Upload class="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-foreground">Evaluación aprobada ✓ — Falta el ejercicio práctico</p>
                                        <p class="text-xs text-muted-foreground">Sube tu archivo para completar el módulo y obtener el trofeo.</p>
                                    </div>
                                </div>

                                <!-- Practice description -->
                                <p class="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                                    {{ store.modules.find((m: any) => m.id === mod.id)?.evaluation?.practice_exercise }}
                                </p>

                                <!-- File picker -->
                                <label class="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-4 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group/ul">
                                    <component :is="practiceFile[mod.id] ? FileText : Upload" class="w-5 h-5"
                                        :class="practiceFile[mod.id] ? 'text-primary' : 'text-muted-foreground group-hover/ul:text-primary'" />
                                    <span class="text-xs font-semibold" :class="practiceFile[mod.id] ? 'text-foreground' : 'text-muted-foreground'">
                                        {{ practiceFile[mod.id] ? practiceFile[mod.id]!.name : 'Seleccionar archivo' }}
                                    </span>
                                    <span class="text-[10px] text-muted-foreground/70">Imagen, PDF, Word, Video — máx. 30 MB</span>
                                    <input type="file" class="hidden" :accept="ACCEPTED_EXTENSIONS" @change="(e) => onPracticeFileSelected(mod.id, e)" />
                                </label>

                                <div v-if="practiceError[mod.id]" class="flex items-center gap-1.5 mt-2 text-destructive text-xs">
                                    <AlertCircle class="w-3.5 h-3.5 shrink-0" /> {{ practiceError[mod.id] }}
                                </div>

                                <!-- Uploading state -->
                                <template v-if="uploadStates[mod.id]?.isUploading">
                                    <Loader2 class="w-4 h-4 text-primary animate-spin shrink-0" />
                                    <div class="flex-1">
                                        <div
                                            class="flex justify-between text-[10px] text-muted-foreground mb-1">
                                            <span>Subiendo archivo...</span>
                                            <span class="font-bold text-primary">{{
                                                uploadStates[mod.id].progress }}%</span>
                                        </div>
                                        <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div class="h-full bg-primary rounded-full transition-all duration-300"
                                                :style="`width: ${uploadStates[mod.id].progress}%`" />
                                        </div>
                                    </div>
                                </template>

                                <button v-if="practiceFile[mod.id]" @click.stop="handlePracticeUpload(mod.id)"
                                    :disabled="uploadStates[mod.id]?.isUploading"
                                    class="w-full mt-3 gradient-bg text-primary-foreground text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50">
                                    <Loader2 v-if="uploadStates[mod.id]?.isUploading" class="w-4 h-4 animate-spin" />
                                    <Upload v-else class="w-4 h-4" />
                                    {{ uploadStates[mod.id]?.isUploading ? 'Subiendo...' : 'Entregar ejercicio' }}
                                </button>
                            </div>
                        </template>

                        <template v-else-if="getModuleState(mod.id) === 'needs_review'">
                            <div class="p-5 flex items-center gap-3 bg-amber-500/5 border-t border-amber-500/20">
                                <AlertCircle class="w-8 h-8 text-amber-400 shrink-0" />
                                <div>
                                    <p class="text-sm font-bold text-amber-600">En Revisión</p>
                                    <p class="text-xs text-muted-foreground">Has entregado el ejercicio y está pendiente de revisión.</p>
                                </div>
                            </div>
                        </template>

                        <!-- ④ Complete → trofeo ganado -->
                        <template v-else-if="getModuleState(mod.id) === 'complete'">
                            <div class="p-5 flex items-center gap-3 bg-amber-500/5 border-t border-amber-500/20">
                                <Trophy class="w-8 h-8 text-amber-400 fill-amber-300 shrink-0" />
                                <div>
                                    <p class="text-sm font-bold text-amber-600">¡Módulo completado!</p>
                                    <p class="text-xs text-muted-foreground">Has terminado todas las lecciones y entregado los requisitos del módulo.</p>
                                </div>
                            </div>
                        </template>

                    </div>
                </Transition>
            </div>

            <div v-if="currentFolderModules.length === 0"
                class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                <p class="text-muted-foreground">No hay módulos en esta carpeta.</p>
            </div>
        </div>
    </template>

</div>

<!-- Loading -->
<div v-else-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-muted-foreground">Cargando contenido...</p>
    </div>
</div>

<!-- Not found -->
<div v-else class="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border">
    <Monitor class="w-12 h-12 mb-4 opacity-20" />
    <h3 class="text-lg font-bold">Plataforma no encontrada</h3>
    <p class="text-sm">El contenido solicitado no está disponible o no tienes acceso.</p>
    <RouterLink to="/" class="mt-6 text-sm font-bold text-primary hover:underline">Volver al Dashboard</RouterLink>
</div>

<!-- Evaluation Modal -->
<EvaluationModal
    v-if="activeEval && activeEvalModuleId"
    :evaluation="activeEval"
    :module-name="currentFolderModules.find(m => m.id === activeEvalModuleId)?.name ?? ''"
    @passed="onEvalPassed"
    @close="closeEval"
    @practice-submitted="closeEval"
/>
</template>

<style scoped>
.trophy-pop-enter-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.trophy-pop-enter-from   { opacity: 0; transform: scale(0.4) rotate(-20deg); }
.trophy-pop-leave-active { transition: all 0.2s ease; }
.trophy-pop-leave-to     { opacity: 0; transform: scale(0.6); }

.fade-slide-enter-active { transition: all 0.25s ease; }
.fade-slide-enter-from   { opacity: 0; transform: translateY(-6px); }
.fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
