<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import { CheckCircle2, ArrowLeft, ArrowRight, ExternalLink, FileText, PlayCircle, Monitor, Globe } from 'lucide-vue-next'

const route = useRoute()
const store = useLmsStore()

const platformId = computed(() => parseInt(route.params.categoryId as string))
const lessonId = computed(() => parseInt(route.params.lessonId as string))

onMounted(async () => {
    await store.fetchPlatforms()
    if (platformId.value) {
        await store.fetchPlatformContent(platformId.value)
    }
})

const platform = computed(() => store.platforms.find(p => p.id === platformId.value))
const lesson = computed(() => store.lessons.find(l => l.id === lessonId.value))

// Get the specific content for THIS platform
const platformContent = computed(() => {
    if (!lesson.value || !platformId.value) return null
    return lesson.value.platform_contents?.find(pc => pc.platform_id === platformId.value) || null
})

// Find the first module this lesson belongs to (for breadcrumbs)
const firstModule = computed(() => {
    if (!lesson.value || !lesson.value.modules) return null
    return lesson.value.modules[0]
})

const allLessons = computed(() => {
    if (!platform.value) return []
    return store.getPlatformModules(platform.value.id).flatMap(m => store.getModuleLessons(m.id))
})

const currentIndex = computed(() => allLessons.value.findIndex(l => l.id === lessonId.value))
const prevLesson = computed(() => currentIndex.value > 0 ? allLessons.value[currentIndex.value - 1] : null)
const nextLesson = computed(() => currentIndex.value < allLessons.value.length - 1 ? allLessons.value[currentIndex.value + 1] : null)
const status = computed(() => store.getLessonStatus(lessonId.value))

// Mark viewed when lesson changes
watch(lessonId, (id) => {
    if (id) store.markLessonViewed(id)
}, { immediate: true })

function getContent(pc: any): string {
    if (!pc || !pc.content) return ''
    if (typeof pc.content === 'object' && pc.content !== null) {
        return pc.content.value || ''
    }
    return pc.content // Legacy string support
}
</script>

<template>
    <div v-if="platform && lesson" class="w-full px-4 py-8 md:px-6">
        <!-- Breadcrumb -->
        <div class="mb-6">
            <Breadcrumbs :items="[
                { label: 'Dashboard', to: '/' },
                { label: platform.name, to: `/curso/${platform.id}` },
                { label: firstModule?.name || 'Funcionalidad', to: `/curso/${platform.id}` },
                { label: lesson.title },
            ]" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

            <!-- Sidebar -->
            <div class="lg:col-span-1 hidden lg:block">
                <div class="sticky top-6 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                    <h2
                        class="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Monitor class="w-4 h-4" />
                        Contenido
                    </h2>

                    <div class="space-y-1 max-h-[70vh] overflow-auto pr-1">
                        <RouterLink v-for="l in allLessons" :key="l.id" :to="`/curso/${platformId}/leccion/${l.id}`"
                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group border"
                            :class="l.id === lessonId
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
                </div>
            </div>

            <!-- Main -->
            <div class="lg:col-span-3 space-y-6">

                <!-- Content Card -->
                <div class="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">

                    <!-- Content -->
                    <div v-if="platformContent">

                        <!-- Video -->
                        <div v-if="platformContent.type === 'video' && getContent(platformContent)"
                            class="aspect-video bg-black">
                            <iframe :src="getContent(platformContent)" class="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen :title="platformContent.title || lesson.title" />
                        </div>

                        <!-- PDF -->
                        <div v-else-if="platformContent.type === 'pdf' && getContent(platformContent)"
                            class="p-12 text-center bg-muted/10">
                            <FileText class="w-16 h-16 text-primary/40 mx-auto mb-5" />
                            <h3 class="text-lg font-semibold text-foreground mb-2">Documento PDF</h3>
                            <p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                Este recurso está disponible para visualizar o descargar.
                            </p>
                            <a :href="getContent(platformContent)" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                                <ExternalLink class="w-4 h-4" />
                                Abrir documento
                            </a>
                        </div>

                        <!-- Text -->
                        <div v-else-if="platformContent.type === 'text' && getContent(platformContent)"
                            class="p-6 md:p-10 prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-relaxed"
                            v-html="getContent(platformContent)" />

                        <!-- Link -->
                        <div v-else-if="platformContent.type === 'link' && getContent(platformContent)"
                            class="p-12 text-center bg-muted/10">
                            <Globe class="w-16 h-16 text-primary/40 mx-auto mb-5" />
                            <h3 class="text-lg font-semibold text-foreground mb-2">Recurso externo</h3>
                            <p class="text-sm text-muted-foreground mb-6">
                                Este tutorial se completa en una herramienta externa.
                            </p>
                            <a :href="getContent(platformContent)" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                                <ExternalLink class="w-4 h-4" />
                                Ir al sitio
                            </a>
                        </div>

                        <!-- Fallback -->
                        <div v-else class="p-16 text-center text-muted-foreground">
                            <p>Contenido no disponible.</p>
                        </div>
                    </div>

                    <!-- Empty -->
                    <div v-else class="p-16 text-center bg-muted/20">
                        <Monitor class="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 class="text-lg font-semibold text-foreground">Sin contenido</h3>
                        <p class="text-sm text-muted-foreground max-w-sm mx-auto">
                            Esta tutorial aún no tiene contenido configurado para {{ platform.name }}.
                        </p>
                    </div>

                    <!-- Lesson Info -->
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

                            <button @click="store.toggleLessonComplete(lesson.id)"
                                class="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all border"
                                :class="status === 'completed'
                                    ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                                    : 'bg-card text-muted-foreground border-border hover:text-primary hover:border-primary/30'">
                                <CheckCircle2 class="w-5 h-5" />
                                {{ status === 'completed' ? 'Completada' : 'Marcar como completada' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="flex items-center justify-between pt-2">

                    <RouterLink v-if="prevLesson" :to="`/curso/${platformId}/leccion/${prevLesson.id}`"
                        class="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition">
                        <ArrowLeft class="w-4 h-4" />
                        <span class="hidden sm:inline">Anterior</span>
                    </RouterLink>

                    <div v-else />

                    <RouterLink v-if="nextLesson" :to="`/curso/${platformId}/leccion/${nextLesson.id}`"
                        class="flex items-center gap-3 px-6 py-3 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                        <span class="hidden sm:inline">Siguiente</span>
                        <ArrowRight class="w-4 h-4" />
                    </RouterLink>

                    <RouterLink v-else :to="`/curso/${platformId}`"
                        class="flex items-center gap-3 px-6 py-3 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.03] transition">
                        Finalizar Curso
                        <ArrowRight class="w-4 h-4" />
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>

    <!-- Empty -->
    <div v-else
        class="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border">
        <PlayCircle class="w-12 h-12 mb-4 opacity-20" />
        <h3 class="text-lg font-semibold">Tutorial no encontrado</h3>
        <p class="text-sm">El recurso solicitado no existe o fue movido.</p>
        <RouterLink :to="platform ? `/curso/${platform.id}` : '/'"
            class="mt-6 text-sm font-semibold text-primary hover:underline">
            Volver
        </RouterLink>
    </div>
</template>
