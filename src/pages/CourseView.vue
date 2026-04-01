<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import {
  CheckCircle2, Circle, PlayCircle, FileText,
  Link as LinkIcon, Type, ChevronDown, Clock, ArrowRight,
} from 'lucide-vue-next'

const route = useRoute()
const store = useLmsStore()

const categoryId = computed(() => route.params.categoryId as string)
const category = computed(() => store.categories.find(c => c.id === categoryId.value))
const mods = computed(() => category.value ? store.getCategoryModules(category.value.id) : [])
const prog = computed(() => category.value ? store.getCourseProgress(category.value.id) : null)

const openModules = ref<Set<string>>(new Set())

// Open all modules on load
watch(mods, (newMods) => {
  if (openModules.value.size === 0 && newMods.length > 0) {
    openModules.value = new Set(newMods.map(m => m.id))
  }
}, { immediate: true })

function toggleModule(modId: string) {
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
  <div v-if="category" class="w-full">
    <Breadcrumbs :items="[{ label: 'Dashboard', to: '/' }, { label: category.name }]" />

    <!-- Header -->
    <div class="bg-card rounded-xl border border-border p-6 mb-6">
      <h1 class="text-2xl font-bold text-foreground mb-2">{{ category.name }}</h1>
      <p class="text-muted-foreground text-sm mb-4">{{ category.description }}</p>
      <div class="flex items-center gap-6">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-muted-foreground font-medium">Progreso general</span>
            <span class="text-xs font-bold text-foreground ml-3">{{ prog?.percentage }}%</span>
          </div>
          <div class="progress-bar w-48">
            <div class="progress-fill" :style="`width: ${prog?.percentage}%`" />
          </div>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ prog?.completedLessons }}/{{ prog?.totalLessons }} lecciones
        </span>
      </div>
    </div>

    <!-- Modules -->
    <div class="space-y-3">
      <div
        v-for="(mod, modIndex) in mods"
        :key="mod.id"
        class="bg-card rounded-xl border border-border overflow-hidden"
      >
        <button
          @click="toggleModule(mod.id)"
          class="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
        >
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg gradient-bg text-primary-foreground text-sm font-bold flex items-center justify-center">
              {{ modIndex + 1 }}
            </span>
            <div>
              <h3 class="font-semibold text-foreground text-sm">{{ mod.name }}</h3>
              <p class="text-xs text-muted-foreground">
                {{ store.getModuleLessons(mod.id).filter(l => store.getLessonStatus(l.id) === 'completed').length }}/{{ store.getModuleLessons(mod.id).length }} completadas
              </p>
            </div>
          </div>
          <ChevronDown
            class="w-5 h-5 text-muted-foreground transition-transform"
            :class="openModules.has(mod.id) ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="openModules.has(mod.id)" class="border-t border-border">
          <RouterLink
            v-for="lesson in store.getModuleLessons(mod.id)"
            :key="lesson.id"
            :to="`/curso/${categoryId}/leccion/${lesson.id}`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border last:border-b-0 group"
          >
            <CheckCircle2 v-if="store.getLessonStatus(lesson.id) === 'completed'" class="w-5 h-5 text-success shrink-0" />
            <PlayCircle v-else-if="store.getLessonStatus(lesson.id) === 'in_progress'" class="w-5 h-5 text-primary shrink-0" />
            <Circle v-else class="w-5 h-5 text-muted-foreground shrink-0 opacity-40" />

            <component :is="contentIcons[lesson.contentType] || FileText" class="w-4 h-4 text-muted-foreground shrink-0" />

            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium truncate group-hover:text-primary transition-colors"
                :class="store.getLessonStatus(lesson.id) === 'completed' ? 'text-muted-foreground' : 'text-foreground'"
              >
                {{ lesson.title }}
              </p>
              <p class="text-xs text-muted-foreground truncate">{{ lesson.shortDescription }}</p>
            </div>

            <span v-if="lesson.duration" class="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock class="w-3 h-3" />
              {{ lesson.duration }}
            </span>

            <ArrowRight class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 opacity-30" />
          </RouterLink>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="text-center py-16 text-muted-foreground">Curso no encontrado</div>
</template>
