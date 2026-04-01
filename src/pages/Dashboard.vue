<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import {
    TrendingUp, Settings, Users, Monitor, BookOpen,
    ArrowRight, CheckCircle2, Clock,
} from 'lucide-vue-next'

const store = useLmsStore()

const filter = ref<'all' | 'in_progress' | 'completed'>('all')
const search = ref('')

const iconMap: Record<string, any> = { TrendingUp, Settings, Users, Monitor }

const publishedCats = computed(() => store.categories.filter(c => c.published))

const filteredCats = computed(() => {
    return publishedCats.value.filter(c => {
        const prog = store.getCourseProgress(c.id)
        const q = search.value.toLowerCase()
        if (q && !c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false
        if (filter.value === 'completed') return prog.percentage === 100
        if (filter.value === 'in_progress') return prog.percentage > 0 && prog.percentage < 100
        return true
    })
})

const totalCourses = computed(() => publishedCats.value.length)
const completedCourses = computed(() =>
    publishedCats.value.filter(c => store.getCourseProgress(c.id).percentage === 100).length,
)
const inProgressCourses = computed(() => {
    return publishedCats.value.filter(c => {
        const p = store.getCourseProgress(c.id).percentage
        return p > 0 && p < 100
    }).length
})
</script>

<template>
    <div>
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Bienvenido a la <span class="gradient-text">Academia</span>
            </h1>
            <p class="text-muted-foreground">Explora los cursos disponibles y continúa tu aprendizaje.</p>
        </div>

        <!-- Stats -->
        <!-- <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div class="bg-card rounded-xl p-5 border border-border card-hover">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                        <BookOpen class="w-4 h-4 text-primary" />
                    </div>
                    <span class="text-sm text-muted-foreground font-medium">Cursos</span>
                </div>
                <p class="text-2xl font-bold text-foreground">{{ totalCourses }}</p>
            </div>
            <div class="bg-card rounded-xl p-5 border border-border card-hover">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                        <Clock class="w-4 h-4 text-primary" />
                    </div>
                    <span class="text-sm text-muted-foreground font-medium">En progreso</span>
                </div>
                <p class="text-2xl font-bold text-foreground">{{ inProgressCourses }}</p>
            </div>
            <div class="bg-card rounded-xl p-5 border border-border card-hover">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center"
                        style="background-color: hsl(var(--success) / 0.1)">
                        <CheckCircle2 class="w-4 h-4 text-success" />
                    </div>
                    <span class="text-sm text-muted-foreground font-medium">Completados</span>
                </div>
                <p class="text-2xl font-bold text-foreground">{{ completedCourses }}</p>
            </div>
        </div> -->

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-3 mb-6">
            <input v-model="search" type="text" placeholder="Buscar cursos..."
                class="flex-1 px-4 py-2.5 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
                style="border-color: hsl(var(--input)); background-color: hsl(var(--card)); --tw-ring-color: hsl(var(--ring))" />
            <div class="flex gap-2">
                <button v-for="f in (['all', 'in_progress', 'completed'] as const)" :key="f" @click="filter = f"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-all" :class="filter === f
                        ? 'gradient-bg text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'">
                    {{ f === 'all' ? 'Todos' : f === 'in_progress' ? 'En progreso' : 'Completados' }}
                </button>
            </div>
        </div>

        <!-- Course Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <RouterLink v-for="cat in filteredCats" :key="cat.id" :to="`/curso/${cat.id}`"
                class="bg-card rounded-xl border border-border overflow-hidden card-hover group">
                <!-- Color bar -->
                <div class="h-2" :style="`background: linear-gradient(90deg, ${cat.color}, ${cat.color}88)`" />
                <div class="p-5">
                    <div class="flex items-start gap-3 mb-3">
                        <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            :style="`background-color: ${cat.color}22`">
                            <component :is="iconMap[cat.icon] || BookOpen" class="w-5 h-5"
                                :style="`color: ${cat.color}`" />
                        </div>
                        <div class="min-w-0">
                            <h3
                                class="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                                {{ cat.name }}
                            </h3>
                            <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">{{ cat.description }}</p>
                        </div>
                    </div>

                    <!-- Progress -->
                    <!-- <div class="mb-3">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-xs text-muted-foreground font-medium">Progreso</span>
                            <span class="text-xs font-semibold text-foreground">
                                {{ store.getCourseProgress(cat.id).percentage }}%
                            </span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill"
                                :style="`width: ${store.getCourseProgress(cat.id).percentage}%`" />
                        </div>
                    </div> -->

                    <div class="flex items-center justify-between">
                        <!-- <span class="text-xs text-muted-foreground">
                            {{ store.getCourseProgress(cat.id).completedLessons }}/{{
                                store.getCourseProgress(cat.id).totalLessons }} lecciones
                        </span> -->
                        <span className="text-xs text-muted-foreground">{{ store.getCourseProgress(cat.id).totalLessons }} lecciones</span>
                        <span
                            class="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                            <!-- {{ store.getCourseProgress(cat.id).percentage > 0 ? 'Continuar' : 'Comenzar' }} -->
                            Ver categoría
                            <ArrowRight class="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </RouterLink>
        </div>

        <!-- Empty state -->
        <div v-if="filteredCats.length === 0" class="text-center py-16">
            <BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p class="text-muted-foreground">No se encontraron cursos</p>
        </div>
    </div>
</template>
