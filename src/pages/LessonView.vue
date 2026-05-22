<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { useAuthStore } from '@/stores/auth'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import PdfViewer from '@/components/PdfViewer.vue'
import {
    CheckCircle2, ArrowLeft, ArrowRight, ExternalLink, PlayCircle,
    Monitor, Globe, Trophy, Star, PartyPopper, AlertCircle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useLmsStore()
const authStore = useAuthStore()

const platformId = computed(() => parseInt(route.params.categoryId as string))
const lessonId = computed(() => parseInt(route.params.lessonId as string))
const loading = ref(false)

// ─── Completion flags ──────────────────────────────────────────────────────────
const videoEnded = ref(false)
const pdfRead = ref(false)  // emitido por PdfViewer cuando se llega a última pág.
// Link: se habilita después de N segundos de tener el recurso cargado
const linkTimerDone = ref(false)
const LINK_DELAY_MS = 10000  // 10 s mínimos de visualización del enlace
let linkTimer: ReturnType<typeof setTimeout> | null = null

// ─── Modals ────────────────────────────────────────────────────────────────────
const showCompletionModal = ref(false)
const showIncompleteAlert = ref(false)   // aviso cuando faltan lecciones

// ─── Load ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
    loading.value = true
    await store.fetchPlatforms()
    if (platformId.value) {
        await store.fetchPlatformContent(platformId.value)
    }
    loading.value = false
    startLinkTimer()
    // Sincronizar progreso: subir pendientes locales y bajar el estado remoto
    store.pushLocalProgressToApi()
    store.syncProgressFromApi()
})

onBeforeUnmount(() => clearLinkTimer())

// ─── Derived state ─────────────────────────────────────────────────────────────
const platform = computed(() => store.platforms.find(p => p.id === platformId.value))
const lesson = computed(() => store.lessons.find(l => l.id === lessonId.value))
const status = computed(() => store.getLessonStatus(lessonId.value))

const platformContent = computed(() => {
    if (!lesson.value || !platformId.value) return null
    return lesson.value.platform_contents?.find(pc => pc.platform_id === platformId.value) || null
})

// ─── Current module (the one this lesson belongs to) ──────────────────────────
const currentModule = computed(() => {
    if (!lesson.value) return null
    const mods = store.getPlatformModules(platformId.value)
    return mods.find(mod => store.getModuleLessons(mod.id).some(l => l.id === lessonId.value)) ?? null
})

// Only show lessons from the current module in the sidebar
const moduleLessons = computed(() => {
    if (!currentModule.value) return []
    return store.getModuleLessons(currentModule.value.id)
})

// Prev / next within THIS module only
const currentIndexInModule = computed(() => moduleLessons.value.findIndex(l => l.id === lessonId.value))
const prevLesson = computed(() => currentIndexInModule.value > 0 ? moduleLessons.value[currentIndexInModule.value - 1] : null)
const nextLesson = computed(() => currentIndexInModule.value < moduleLessons.value.length - 1 ? moduleLessons.value[currentIndexInModule.value + 1] : null)
const isLastOfModule = computed(() => !nextLesson.value)

// All lessons of this module completed?
const allModuleLessonsCompleted = computed(() =>
    moduleLessons.value.length > 0 &&
    moduleLessons.value.every(l => store.getLessonStatus(l.id) === 'completed')
)

// ─── canComplete: when the completion button becomes active ────────────────────
const canComplete = computed(() => {
    const type = platformContent.value?.type
    if (type === 'video') return videoEnded.value
    if (type === 'pdf') return pdfRead.value
    if (type === 'link') return linkTimerDone.value
    // image / text: always available
    return true
})

// ─── Timer helpers for Link ──────────────────────────────────────────────────
function clearLinkTimer() {
    if (linkTimer) { clearTimeout(linkTimer); linkTimer = null }
}

function startLinkTimer() {
    clearLinkTimer()
    linkTimerDone.value = false
    if (platformContent.value?.type === 'link') {
        linkTimer = setTimeout(() => {
            linkTimerDone.value = true
        }, LINK_DELAY_MS)
    }
}

// ─── PDF read callback from PdfViewer ────────────────────────────────────────
function onPdfRead() {
    pdfRead.value = true
}

// ─── Reset on lesson change ───────────────────────────────────────────────────
watch(lessonId, (id) => {
    if (id && currentModule.value?.id) store.markLessonViewed(id, currentModule.value.id)
    videoEnded.value = false
    pdfRead.value = false
    linkTimerDone.value = false
    startLinkTimer()
}, { immediate: true })

// Re-start link timer when content type resolves (async load)
watch(platformContent, () => { startLinkTimer() })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getContent(pc: any): string {
    if (!pc || !pc.content) return ''
    if (typeof pc.content === 'object' && pc.content !== null) return pc.content.value || ''
    return pc.content
}

function onVideoEnded() {
    videoEnded.value = true
}

// ─── Sidebar breadcrumb info ──────────────────────────────────────────────────
const firstModule = computed(() => currentModule.value)

// ─── "Finalizar módulo" button handler ───────────────────────────────────────
function handleFinishModule() {
    if (!allModuleLessonsCompleted.value) {
        showIncompleteAlert.value = true
        setTimeout(() => { showIncompleteAlert.value = false }, 4000)
        return
    }
    // Guardar finalización del módulo en la BD
    if (currentModule.value?.id) {
        store.completeModule(currentModule.value.id)
    }
    showCompletionModal.value = true
}

function closeCompletionModal() {
    showCompletionModal.value = false
    router.push({ name: 'course', params: { categoryId: platformId.value } })
}

const userName = computed(() => authStore.user?.name || 'Usuario')
</script>

<template>
    <div v-if="platform && lesson && !loading" class="w-full py-8">

        <!-- Breadcrumb -->
        <div class="mb-6">
            <Breadcrumbs :items="[
                { label: 'Dashboard', to: { name: 'dashboard' } },
                { label: platform.name, to: { name: 'course', params: { categoryId: platform.id } } },
                { label: firstModule?.name || 'Módulo', to: { name: 'course', params: { categoryId: platform.id } } },
                { label: lesson.title },
            ]" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">

            <!-- ═══ Sidebar: solo lecciones del módulo activo ════════════════════ -->
            <div class="lg:col-span-1 hidden lg:block">
                <div class="sticky top-6 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">

                    <!-- Module name as header -->
                    <div class="mb-4">
                        <p
                            class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <Monitor class="w-3.5 h-3.5" />
                            Funcionalidad
                        </p>
                        <h2 class="text-sm font-bold text-foreground leading-tight">
                            {{ currentModule?.name || platform.name }}
                        </h2>
                    </div>

                    <div class="h-px bg-border/50 mb-3" />

                    <!-- Lesson list (only this module) -->
                    <div class="space-y-0.5 max-h-[65vh] overflow-auto pr-1">
                        <RouterLink v-for="l in moduleLessons" :key="l.id"
                            :to="{ name: 'lesson', params: { categoryId: platformId, lessonId: l.id } }"
                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border" :class="l.id === lessonId
                                ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                                : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'">
                            <div class="shrink-0">
                                <CheckCircle2 v-if="store.getLessonStatus(l.id) === 'completed'"
                                    class="w-4 h-4 text-success" />
                                <div v-else-if="l.id === lessonId"
                                    class="w-4 h-4 rounded-full border-2 border-primary animate-pulse" />
                                <div v-else class="w-4 h-4 rounded-full border border-muted-foreground/30" />
                            </div>
                            <span class="truncate text-xs leading-tight">{{ l.title }}</span>
                        </RouterLink>
                    </div>

                    <!-- Module progress bar -->
                    <div class="mt-4 pt-3 border-t border-border/40">
                        <div class="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                            <span>Progreso</span>
                            <span>
                                {{moduleLessons.filter(l => store.getLessonStatus(l.id) === 'completed').length}}
                                / {{ moduleLessons.length }}
                            </span>
                        </div>
                        <div class="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div class="h-full gradient-bg rounded-full transition-all duration-500" :style="{
                                width: moduleLessons.length
                                    ? `${(moduleLessons.filter(l => store.getLessonStatus(l.id) === 'completed').length / moduleLessons.length) * 100}%`
                                    : '0%'
                            }" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══ Main content ══════════════════════════════════════════════════ -->
            <div class="lg:col-span-3 space-y-6">

                <!-- Incomplete alert (toast style) -->
                <Transition name="fade-up">
                    <div v-if="showIncompleteAlert"
                        class="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-sm font-medium shadow-sm">
                        <AlertCircle class="w-5 h-5 shrink-0" />
                        <span>Debes completar todas las lecciones antes de finalizar el módulo.</span>
                    </div>
                </Transition>

                <!-- Content Card -->
                <div class="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">

                    <div v-if="platformContent">

                        <!-- ═══ VIDEO ══════════════════════════════════════════════ -->
                        <div v-if="platformContent.type === 'video' && getContent(platformContent)"
                            class="aspect-video bg-black">
                            <video :src="getContent(platformContent)" class="w-full h-full" controls
                                @ended="onVideoEnded" />
                        </div>

                        <!-- ═══ PDF ════════════════════════════════════════════════ -->
                        <!-- Renderizado con pdfjs-dist; emite @read al llegar a la última página -->
                        <div v-else-if="platformContent.type === 'pdf' && getContent(platformContent)">
                            <PdfViewer :src="getContent(platformContent)" @read="onPdfRead" />
                            <!-- <div class="flex items-center px-5 py-3 border-t border-border/40 bg-muted/5">
                                <a :href="getContent(platformContent)" target="_blank" rel="noopener noreferrer"
                                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                                    Abrir documento
                                    <ExternalLink class="w-3.5 h-3.5" />
                                </a>
                            </div> -->
                        </div>

                        <!-- ═══ IMAGE ══════════════════════════════════════════════ -->
                        <div v-else-if="platformContent.type === 'image' && getContent(platformContent)"
                            class="bg-black flex items-center justify-center" style="min-height: 300px;">
                            <img :src="getContent(platformContent)" class="max-w-full max-h-[520px] object-contain"
                                alt="" />
                        </div>

                        <!-- ═══ TEXT ═══════════════════════════════════════════════ -->
                        <div v-else-if="platformContent.type === 'text' && getContent(platformContent)"
                            class="p-6 md:p-10 prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-relaxed"
                            v-html="getContent(platformContent)" />

                        <!-- ═══ LINK ═══════════════════════════════════════════════ -->
                        <!-- Timer de 10 s para habilitar el botón de completar -->
                        <div v-else-if="platformContent.type === 'link' && getContent(platformContent)"
                            class="bg-muted/10">
                            <div class="flex items-center text-left w-full px-6 pt-5 pb-3">
                                <Globe class="w-10 h-10 text-primary/40 mr-4 shrink-0" />
                                <div>
                                    <h3 class="text-base font-semibold text-foreground">Recurso externo</h3>
                                    <p class="text-xs text-muted-foreground">
                                        Este tutorial se completa en una herramienta externa.
                                    </p>
                                </div>
                            </div>
                            <iframe :src="getContent(platformContent)" class="w-full border-0"
                                style="height: 480px; display: block;" frameborder="0" />
                            <div class="flex items-center justify-between px-5 py-3">
                                <a :href="getContent(platformContent)" target="_blank" rel="noopener noreferrer"
                                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                                    <ExternalLink class="w-3.5 h-3.5" />
                                    Ir al sitio
                                </a>
                                <!-- Indicador mientras el timer corre -->
                                <span v-if="!linkTimerDone"
                                    class="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                    <span class="inline-block w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                                    Explorando el recurso...
                                </span>
                            </div>
                        </div>

                        <!-- Fallback -->
                        <div v-else class="p-16 text-center text-muted-foreground">
                            <p>Contenido no disponible.</p>
                        </div>
                    </div>

                    <!-- No content configured -->
                    <div v-else class="p-16 text-center bg-muted/20">
                        <Monitor class="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 class="text-lg font-semibold text-foreground">Sin contenido</h3>
                        <p class="text-sm text-muted-foreground max-w-sm mx-auto">
                            Esta lección aún no tiene contenido configurado para {{ platform.name }}.
                        </p>
                    </div>

                    <!-- ─── Lesson info + completion button ─── -->
                    <div class="p-6 md:p-8 border-t border-border/50 bg-muted/5">
                        <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">

                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2 flex-wrap">
                                    <span
                                        class="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                                        {{ platformContent?.type || lesson.type_content }}
                                    </span>
                                    <h1 class="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                                        {{ platformContent?.title || lesson.title }}
                                    </h1>
                                </div>
                                <p class="text-sm md:text-base text-muted-foreground leading-relaxed mt-2">
                                    {{ lesson.description || 'Sin descripción disponible.' }}
                                </p>
                            </div>

                            <!-- Completion button -->
                            <Transition name="fade-up" mode="out-in">
                                <button v-if="canComplete || status === 'completed'" key="active"
                                    @click="store.toggleLessonComplete(lesson.id, currentModule?.id)"
                                    class="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all border"
                                    :class="status === 'completed'
                                        ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                                        : 'gradient-bg text-primary-foreground border-transparent shadow-md hover:scale-[1.03]'">
                                    <CheckCircle2 class="w-5 h-5" />
                                    {{ status === 'completed' ? 'Completada ✓' : 'Marcar como completada' }}
                                </button>
                                <div v-else key="disabled"
                                    class="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-muted-foreground border border-dashed border-border select-none cursor-not-allowed opacity-50">
                                    <CheckCircle2 class="w-5 h-5" />
                                    Completar al finalizar
                                </div>
                            </Transition>
                        </div>
                    </div>
                </div>

                <!-- ─── Navigation ─── -->
                <div class="flex items-center justify-between pt-2">

                    <RouterLink v-if="prevLesson"
                        :to="{ name: 'lesson', params: { categoryId: platformId, lessonId: prevLesson.id } }"
                        class="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition">
                        <ArrowLeft class="w-4 h-4" />
                        <span class="hidden sm:inline">Anterior</span>
                    </RouterLink>

                    <div v-else />

                    <!-- Next within module -->
                    <RouterLink v-if="!isLastOfModule"
                        :to="{ name: 'lesson', params: { categoryId: platformId, lessonId: nextLesson!.id } }"
                        class="flex items-center gap-3 px-6 py-3 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                        <span class="hidden sm:inline">Siguiente</span>
                        <ArrowRight class="w-4 h-4" />
                    </RouterLink>

                    <!-- Last lesson of module → Finalizar Módulo -->
                    <button v-else @click="handleFinishModule"
                        class="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold shadow-md hover:scale-[1.03] transition"
                        :class="allModuleLessonsCompleted
                            ? 'gradient-bg text-primary-foreground'
                            : 'bg-muted text-muted-foreground border border-border cursor-default hover:scale-100'">
                        <Trophy class="w-4 h-4" />
                        Finalizar Módulo
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-muted-foreground">Cargando contenido...</p>
        </div>
    </div>

    <!-- Not found -->
    <div v-else
        class="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border">
        <PlayCircle class="w-12 h-12 mb-4 opacity-20" />
        <h3 class="text-lg font-semibold">Tutorial no encontrado</h3>
        <p class="text-sm">El recurso solicitado no existe o fue movido.</p>
        <RouterLink :to="platform ? { name: 'course', params: { categoryId: platform.id } } : { name: 'dashboard' }"
            class="mt-6 text-sm font-semibold text-primary hover:underline">
            Volver
        </RouterLink>
    </div>

    <!-- ═══ Module Completion Modal ════════════════════════════════════════════ -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="showCompletionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
                @click.self="closeCompletionModal">

                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                <div class="relative z-10 w-full max-w-md mx-auto">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden">

                        <!-- Banner -->
                        <div class="gradient-bg p-8 text-center relative overflow-hidden">
                            <div class="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                            <div class="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5" />
                            <div class="relative">
                                <div class="flex items-center justify-center gap-2 mb-4">
                                    <Star class="w-6 h-6 text-yellow-300 fill-yellow-300" />
                                    <Trophy class="w-10 h-10 text-white" />
                                    <Star class="w-6 h-6 text-yellow-300 fill-yellow-300" />
                                </div>
                                <div class="flex items-center justify-center gap-2 mb-1">
                                    <PartyPopper class="w-5 h-5 text-white/80" />
                                    <span
                                        class="text-white/80 text-sm font-medium tracking-wide uppercase">¡Felicidades!</span>
                                    <PartyPopper class="w-5 h-5 text-white/80" />
                                </div>
                                <h2 class="text-2xl font-bold text-white leading-tight">
                                    Módulo Completado
                                </h2>
                            </div>
                        </div>

                        <!-- Body -->
                        <div class="p-8 text-center">
                            <div
                                class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-5 border border-primary/20">
                                <CheckCircle2 class="w-3.5 h-3.5" />
                                Etapa Finalizada
                            </div>

                            <!-- <p class="text-muted-foreground text-sm mb-1">Este logro pertenece a</p> -->
                            <p class="text-2xl font-bold text-foreground mb-4">{{ userName }}</p>

                            <p class="text-muted-foreground text-sm leading-relaxed mb-2">Has completado la etapa</p>
                            <p class="text-lg font-semibold text-foreground mb-6">"{{ currentModule?.name }}"</p>

                            <div class="bg-muted/30 rounded-2xl p-4 mb-6 border border-border/40">
                                <p class="text-sm text-muted-foreground leading-relaxed italic">
                                    El aprendizaje no termina aquí. Cada habilidad que adquieres abre una nueva puerta de posibilidades.
                                </p>
                                <p class="text-sm text-muted-foreground leading-relaxed italic">
                                    ¡Sigue adelante, <strong class="text-foreground not-italic">{{ userName }}</strong>!
                                </p>
                            </div>

                            <div class="flex justify-center gap-1 mb-6">
                                <Star v-for="i in 5" :key="i" class="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            </div>

                            <button @click="closeCompletionModal"
                                class="w-full gradient-bg text-primary-foreground font-semibold py-3 px-6 rounded-xl shadow-md hover:scale-[1.02] transition-transform text-sm">
                                Volver al curso
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .relative {
    transform: scale(0.85) translateY(20px);
}

.modal-leave-to .relative {
    transform: scale(0.9) translateY(10px);
}
</style>
