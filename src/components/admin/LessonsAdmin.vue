<script setup lang="ts">
import { ref } from 'vue'
import { useLmsStore } from '@/stores/lms'
import type { Lesson, ContentType } from '@/types/lms'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-vue-next'

const store = useLmsStore()
const editing = ref<Lesson | null>(null)
const isNew = ref(false)
const contentTypes: ContentType[] = ['video', 'pdf', 'document', 'link', 'text']

function startNew() {
  isNew.value = true
  editing.value = {
    id: `les-${Date.now()}`,
    moduleId: store.modules[0]?.id || '',
    title: '',
    shortDescription: '',
    longDescription: '',
    contentType: 'video',
    order: store.lessons.length + 1,
    published: false,
  }
}

function handleSave() {
  if (!editing.value) return
  if (isNew.value) {
    store.lessons.push(editing.value)
  } else {
    const idx = store.lessons.findIndex(l => l.id === editing.value!.id)
    if (idx !== -1) store.lessons[idx] = { ...editing.value }
  }
  editing.value = null
  isNew.value = false
}

function togglePublish(id: string) {
  const les = store.lessons.find(l => l.id === id)
  if (les) les.published = !les.published
}

function sortedLessons() {
  return [...store.lessons].sort((a, b) => a.order - b.order)
}

function getModuleLabel(moduleId: string) {
  const mod = store.modules.find(m => m.id === moduleId)
  const cat = mod ? store.categories.find(c => c.id === mod.categoryId) : undefined
  return mod ? `${cat?.name} → ${mod.name}` : moduleId
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-foreground">Lecciones</h2>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium"
      >
        <Plus class="w-4 h-4" />
        Nueva Lección
      </button>
    </div>

    <!-- Form -->
    <div v-if="editing" class="bg-card rounded-xl border border-border p-5 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
          <input v-model="editing.title" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
          <select v-model="editing.moduleId" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option v-for="m in store.modules" :key="m.id" :value="m.id">{{ getModuleLabel(m.id) }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Tipo de contenido</label>
          <select v-model="editing.contentType" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct.charAt(0).toUpperCase() + ct.slice(1) }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Duración</label>
          <input v-model="editing.duration" placeholder="Ej: 15 min" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div v-if="editing.contentType !== 'text'" class="md:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">URL del contenido</label>
          <input v-model="editing.contentUrl" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div v-if="editing.contentType === 'text'" class="md:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Contenido (HTML)</label>
          <textarea v-model="editing.richTextContent" rows="5" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-xs" />
        </div>
        <div class="md:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Descripción corta</label>
          <input v-model="editing.shortDescription" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div class="md:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Descripción larga</label>
          <textarea v-model="editing.longDescription" rows="3" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
      </div>
      <div class="flex gap-2 mt-4 justify-end">
        <button @click="editing = null; isNew = false" class="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
        <button @click="handleSave" class="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium">Guardar</button>
      </div>
    </div>

    <!-- List -->
    <div class="space-y-2">
      <div
        v-for="les in sortedLessons()"
        :key="les.id"
        class="flex items-center gap-3 bg-card rounded-lg border border-border p-4"
      >
        <GripVertical class="w-4 h-4 text-muted-foreground opacity-40 cursor-grab" />
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-foreground">{{ les.title }}</p>
          <p class="text-xs text-muted-foreground">{{ getModuleLabel(les.moduleId) }} · {{ les.contentType }} · {{ les.duration }}</p>
        </div>
        <span
          class="text-xs px-2 py-1 rounded-full"
          :class="les.contentType === 'video' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'"
        >{{ les.contentType }}</span>
        <button
          @click="togglePublish(les.id)"
          class="p-2 rounded-lg transition-colors"
          :class="les.published ? 'text-success hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'"
        >
          <Eye v-if="les.published" class="w-4 h-4" />
          <EyeOff v-else class="w-4 h-4" />
        </button>
        <button @click="editing = { ...les }" class="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Edit class="w-4 h-4" />
        </button>
        <button
          @click="store.lessons.splice(store.lessons.findIndex(l => l.id === les.id), 1)"
          class="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
