<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Lesson, ContentType } from '@/types/academy-type'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2, Video, FileText, Link, Type } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Lesson>>({})
const isNew = ref(false)
const isSubmitting = ref(false)

const contentTypes: { value: ContentType; label: string; icon: any }[] = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'link', label: 'Enlace', icon: Link },
  { value: 'text', label: 'Texto/Lectura', icon: Type },
]

function startNew() {
  isNew.value = true
  editing.value = {
    title: '',
    shortDescription: '',
    longDescription: '',
    moduleId: store.modules[0]?.id || '',
    contentType: 'video',
    order: store.lessons.length + 1,
    published: true,
  }
  showModal.value = true
}

function startEdit(lesson: Lesson) {
  isNew.value = false
  editing.value = { ...lesson }
  showModal.value = true
}

async function handleSave() {
  if (!editing.value.title || !editing.value.moduleId) return
  
  isSubmitting.value = true
  try {
    if (isNew.value) {
      await store.createLesson(editing.value)
    } else {
      await store.updateLesson(editing.value.id!, editing.value)
    }
    showModal.value = false
    editing.value = {}
  } catch (error) {
    console.error('Error saving lesson:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(id: string) {
  if (confirm('¿Estás seguro de eliminar esta lección?')) {
    await store.deleteLesson(id)
  }
}

async function togglePublish(lesson: Lesson) {
  await store.updateLesson(lesson.id, { published: !lesson.published })
}

const getModuleName = (id: string) => store.modules.find(m => m.id === id)?.name || 'Sin módulo'
const getContentTypeIcon = (type: ContentType) => contentTypes.find(t => t.value === type)?.icon || Type

onMounted(() => {
  if (store.lessons.length === 0) store.fetchAllData()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-foreground">Lecciones</h2>
        <p class="text-sm text-muted-foreground">Contenido educativo detallado para cada módulo.</p>
      </div>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
      >
        <Plus class="w-4 h-4" />
        Nueva Lección
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 class="w-8 h-8 animate-spin mb-2" />
      <p>Cargando lecciones...</p>
    </div>

    <!-- List -->
    <div v-else class="grid gap-3">
      <div
        v-for="lesson in store.lessons"
        :key="lesson.id"
        class="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors group"
      >
        <div class="cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical class="w-4 h-4 text-muted-foreground" />
        </div>

        <div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <component :is="getContentTypeIcon(lesson.contentType)" class="w-5 h-5 text-muted-foreground" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-bold text-sm text-foreground">{{ lesson.title }}</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase tracking-wider">
              {{ getModuleName(lesson.moduleId) }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground truncate">{{ lesson.shortDescription || 'Sin descripción' }}</p>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="togglePublish(lesson)"
            class="p-2 rounded-lg transition-all"
            :class="lesson.published ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
          >
            <Eye v-if="lesson.published" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
          <button
            @click="startEdit(lesson)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Edit class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(lesson.id)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="store.lessons.length === 0" class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
        <p class="text-muted-foreground">No hay lecciones registradas.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal
      :show="showModal"
      :title="isNew ? 'Nueva Lección' : 'Editar Lección'"
      @close="showModal = false"
    >
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Título de la Lección</label>
            <input
              v-model="editing.title"
              placeholder="Ej: Políticas de Privacidad"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none"
            />
          </div>

          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Módulo</label>
            <select
              v-model="editing.moduleId"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
            >
              <option value="" disabled>Selecciona un módulo</option>
              <option v-for="mod in store.modules" :key="mod.id" :value="mod.id">
                {{ mod.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Tipo de Contenido</label>
            <select
              v-model="editing.contentType"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
            >
              <option v-for="type in contentTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">URL / Recurso</label>
            <input
              v-model="editing.contentUrl"
              placeholder="URL de video, PDF o enlace externo..."
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción Corta</label>
            <input
              v-model="editing.shortDescription"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Contenido Extendido</label>
            <textarea
              v-model="editing.longDescription"
              rows="4"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Orden</label>
            <input
              type="number"
              v-model.number="editing.order"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showModal = false"
          class="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="handleSave"
          :disabled="isSubmitting"
          class="px-8 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Lección' : 'Guardar Cambios') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
