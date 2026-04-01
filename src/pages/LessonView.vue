<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import { CheckCircle2, ArrowLeft, ArrowRight, ExternalLink, FileText, PlayCircle } from 'lucide-vue-next'

const route = useRoute()
const store = useLmsStore()

const categoryId = computed(() => route.params.categoryId as string)
const lessonId = computed(() => route.params.lessonId as string)

const category = computed(() => store.categories.find(c => c.id === categoryId.value))
const lesson = computed(() => store.lessons.find(l => l.id === lessonId.value))
const module = computed(() => lesson.value ? store.modules.find(m => m.id === lesson.value!.moduleId) : undefined)

const allLessons = computed(() => {
  if (!category.value) return []
  return store.getCategoryModules(category.value.id).flatMap(m => store.getModuleLessons(m.id))
})

const currentIndex = computed(() => allLessons.value.findIndex(l => l.id === lessonId.value))
const prevLesson = computed(() => currentIndex.value > 0 ? allLessons.value[currentIndex.value - 1] : null)
const nextLesson = computed(() => currentIndex.value < allLessons.value.length - 1 ? allLessons.value[currentIndex.value + 1] : null)
const status = computed(() => store.getLessonStatus(lessonId.value))

// Mark viewed when lesson changes
watch(lessonId, (id) => {
  if (id) store.markLessonViewed(id)
}, { immediate: true })
</script>

<template>
  <div v-if="category && lesson && module" class="w-full mx-auto">
    <Breadcrumbs :items="[
      { label: 'Dashboard', to: '/' },
      { label: category.name, to: `/curso/${category.id}` },
      { label: module.name, to: `/curso/${category.id}` },
      { label: lesson.title },
    ]" />

    <!-- Content Area -->
    <div class="bg-card rounded-xl border border-border overflow-hidden mb-6">
      <!-- Video -->
      <div v-if="lesson.contentType === 'video' && lesson.contentUrl" class="aspect-video bg-black/5">
        <iframe :src="lesson.contentUrl" class="w-full h-full max-h-[500px]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen :title="lesson.title" />
      </div>

      <!-- PDF -->
      <div v-else-if="lesson.contentType === 'pdf' && lesson.contentUrl" class="p-6">
        <div class="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center mb-4">
          <div class="text-center">
            <FileText class="w-16 h-16 text-primary mx-auto mb-3" />
            <p class="text-sm text-muted-foreground mb-3">Documento PDF</p>
            <a :href="lesson.contentUrl" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <ExternalLink class="w-4 h-4" />
              Abrir PDF
            </a>
          </div>
        </div>
      </div>

      <!-- Rich Text -->
      <div v-else-if="lesson.contentType === 'text' && lesson.richTextContent"
        class="p-6 prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground"
        v-html="lesson.richTextContent" />

      <!-- Link -->
      <div v-else-if="lesson.contentType === 'link' && lesson.contentUrl" class="p-6">
        <div class="bg-muted rounded-lg p-8 text-center">
          <ExternalLink class="w-12 h-12 text-primary mx-auto mb-3" />
          <p class="text-sm text-muted-foreground mb-4">Recurso externo</p>
          <a :href="lesson.contentUrl" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium">
            <ExternalLink class="w-4 h-4" />
            Abrir enlace
          </a>
        </div>
      </div>

      <!-- Lesson Info -->
      <div class="p-6 border-t border-border">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold text-foreground">{{ lesson.title }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ lesson.longDescription }}</p>
          </div>
          <button @click="store.toggleLessonComplete(lesson.id)"
            class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" :class="status === 'completed'
              ? 'text-success'
              : 'text-muted-foreground hover:text-primary'" :style="status === 'completed'
                ? 'background-color: hsl(var(--success) / 0.1)'
                : 'background-color: hsl(var(--muted))'">
            <CheckCircle2 class="w-4 h-4" />
            {{ status === 'completed' ? 'Completada' : 'Marcar completada' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lesson List -->
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
      <h2 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Lecciones</h2>

      <RouterLink v-for="l in allLessons" :key="l.id" :to="`/curso/${categoryId}/leccion/${l.id}`"
        :class="`flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border last:border-b-0 transition-colors 
                ${l.id === lesson.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'}`">
        <span v-if="store.getLessonStatus(l.id) === 'completed'">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        </span>
        <span v-else-if="l.id === lesson.id">
          <PlayCircle className="w-4 h-4 text-primary shrink-0" />
        </span>
        <span v-else>
          <span className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0" />
        </span>
        <span className="truncate">{{ l.title }}</span>
      </RouterLink>
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between gap-4">
      <RouterLink v-if="prevLesson" :to="`/curso/${categoryId}/leccion/${prevLesson.id}`"
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
        <ArrowLeft class="w-4 h-4" />
        <span class="hidden sm:inline">{{ prevLesson.title }}</span>
        <span class="sm:hidden">Anterior</span>
      </RouterLink>
      <div v-else />

      <RouterLink v-if="nextLesson" :to="`/curso/${categoryId}/leccion/${nextLesson.id}`"
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
        <span class="hidden sm:inline">{{ nextLesson.title }}</span>
        <span class="sm:hidden">Siguiente</span>
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
      <RouterLink v-else :to="`/curso/${categoryId}`"
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
        Volver al curso
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
    </div>
  </div>

  <div v-else class="text-center py-16 text-muted-foreground">Lección no encontrada</div>
</template>
