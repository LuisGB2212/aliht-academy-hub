<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import {
    CheckCircle2, Circle, PlayCircle, FileText,
    Link as LinkIcon, Type, ChevronDown, Clock, ArrowRight,
    Monitor
} from 'lucide-vue-next'

const route = useRoute()
const store = useLmsStore()

const platformId = computed(() => parseInt(route.params.categoryId as string))
const platform = computed(() => store.platforms.find(p => p.id === platformId.value))
const mods = computed(() => platform.value ? store.getPlatformModules(platform.value.id) : [])
const prog = computed(() => platform.value ? store.getCourseProgress(platform.value.id) : null)

onMounted(async () => {
    await store.fetchPlatforms()
    if (platformId.value) {
        await store.fetchPlatformContent(platformId.value)
    }
})

const openModules = ref<Set<number>>(new Set())

// Open all modules on load
watch(mods, (newMods) => {
    if (openModules.value.size === 0 && newMods.length > 0) {
        openModules.value = new Set(newMods.map(m => m.id))
    }
}, { immediate: true })

function toggleModule(modId: number) {
    const next = new Set(openModules.value)
    if (next.has(modId)) next.delete(modId)
    else next.add(modId)
    openModules.value = next
}

const contentIcons: Record<string, any> = {
    video: PlayCircle,
    pdf: FileText,
    document: FileText,
    link: LinkIcon,
    text: Type,
}
</script>

<template>
    <div v-if="platform" class="w-full px-4 py-8 md:px-6">
        <!-- Header -->
        <div class="relative bg-card rounded-2xl p-4 md:p-10 md:py-6 mb-10 shadow-xs overflow-hidden border border-border/30">
            <!-- Background glow -->
            <div class="absolute -top-20 -right-20 w-52 h-52 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

            <div class="relative z-10">
                <div class="flex items-center justify-between">
                    <div class="w-1/2">
                        <span class="text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-2 block">
                            Academia Corporativa
                        </span>
                        <h1 class="text-2xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
                            Portal <span class="gradient-text">{{ platform.name }}</span>
                        </h1>
                        <p class="text-muted-foreground text-sm md:text-base max-w-3xl leading-relaxed mb-4">
                            {{ platform.description ||
                            'Bienvenido al centro de capacitación de ' + platform.name + '. Aquí encontrarás todo el material necesario para dominar nuestras herramientas.' }}
                        </p>
                    </div>
                    <div class="mr-6" :class="platform.name.toLowerCase() == 'nextravel' ? 'w-64 p-3' : 'w-72'">
                        <img v-if="platform.image_url" :src="platform.image_url" :alt="platform.name" class="w-80 h-auto">
                    </div>
                </div>

                <!-- Stats -->
                <div class="grid md:grid-cols-3 gap-6 items-center">
                    <!-- Progress -->
                    <div class="col-span-2">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs text-muted-foreground font-semibold">Progreso del curso</span>
                            <span class="text-xs font-bold text-foreground">{{ prog?.percentage }}%</span>
                        </div>

                        <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div class="h-full gradient-bg transition-all duration-700 ease-out"
                                :style="`width: ${prog?.percentage}%`">
                            </div>
                        </div>
                    </div>

                    <!-- Counters -->
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

        <!-- Modules -->
        <div class="space-y-5">
            <div v-for="(mod, modIndex) in mods" :key="mod.id"
                class="group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">

                <!-- Module header -->
                <button @click="toggleModule(mod.id)"
                    class="w-full flex items-center justify-between p-5 md:p-6 text-left transition-colors hover:bg-muted/30">
                    
                    <div class="flex items-center gap-4">
                        <!-- Index -->
                        <div
                            class="w-11 h-11 rounded-xl gradient-bg text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                            {{ modIndex + 1 }}
                        </div>

                        <!-- Info -->
                        <div>
                            <h3 class="font-semibold text-foreground text-sm md:text-base uppercase tracking-tight">
                                {{ mod.name }}
                            </h3>

                            <p class="text-xs text-muted-foreground mt-1">
                                {{
                                    store.getModuleLessons(mod.id).filter(l => store.getLessonStatus(l.id) === 'completed').length
                                }}
                                /
                                {{ store.getModuleLessons(mod.id).length }}
                                completadas
                            </p>
                        </div>
                    </div>

                    <!-- Icon -->
                    <ChevronDown
                        class="w-5 h-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary"
                        :class="openModules.has(mod.id) ? 'rotate-180 text-primary' : ''" />
                </button>

                <!-- Lessons -->
                <transition name="fade-slide">
                    <div v-if="openModules.has(mod.id)"
                        class="border-t border-border/50 bg-muted/10 divide-y divide-border/40">

                        <RouterLink v-for="lesson in store.getModuleLessons(mod.id)" :key="lesson.id"
                            :to="{ name: 'lesson', params: { categoryId: platformId, lessonId: lesson.id } }"
                            class="flex items-center gap-4 px-5 md:px-6 py-4 group/item transition-all hover:bg-muted">

                            <!-- Status icon -->
                            <div class="shrink-0">
                                <CheckCircle2 v-if="store.getLessonStatus(lesson.id) === 'completed'"
                                    class="w-5 h-5 text-success" />
                                <PlayCircle v-else-if="store.getLessonStatus(lesson.id) === 'in_progress'"
                                    class="w-5 h-5 text-primary" />
                                <Circle v-else class="w-5 h-5 text-muted-foreground opacity-30" />
                            </div>

                            <!-- Content -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <component :is="contentIcons[lesson.type_content] || FileText"
                                        class="w-4 h-4 text-muted-foreground opacity-60" />

                                    <p class="text-sm md:text-[15px] font-semibold truncate transition-colors"
                                        :class="store.getLessonStatus(lesson.id) === 'completed'
                                            ? 'text-muted-foreground'
                                            : 'text-foreground group-hover/item:text-primary'">
                                        {{ lesson.title }}
                                    </p>
                                </div>

                                <p class="text-xs text-muted-foreground truncate opacity-80">
                                    {{ lesson.description || 'Sin descripción adicional' }}
                                </p>
                            </div>

                            <!-- Arrow -->
                            <ArrowRight
                                class="w-5 h-5 text-primary opacity-0 translate-x-[-8px] transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                        </RouterLink>
                    </div>
                </transition>
            </div>
        </div>
    </div>

    <div v-else
        class="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border">
        <Monitor class="w-12 h-12 mb-4 opacity-20" />
        <h3 class="text-lg font-bold">Plataforma no encontrada</h3>
        <p class="text-sm">El contenido solicitado no está disponible o no tienes acceso.</p>
        <RouterLink to="/" class="mt-6 text-sm font-bold text-primary hover:underline">Volver al Dashboard</RouterLink>
    </div>
</template>
