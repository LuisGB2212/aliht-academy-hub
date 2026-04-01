<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Module } from '@/types/academy-type'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2 } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Module>>({})
const isNew = ref(false)
const isSubmitting = ref(false)

function startNew() {
  isNew.value = true
  editing.value = {
    name: '',
    shortDescription: '',
    longDescription: '',
    categoryId: store.categories[0]?.id || '',
    order: store.modules.length + 1,
    published: true,
  }
  showModal.value = true
}

function startEdit(mod: Module) {
  isNew.value = false
  editing.value = { ...mod }
  showModal.value = true
}

async function handleSave() {
  if (!editing.value.name || !editing.value.categoryId) return
  
  isSubmitting.value = true
  try {
    if (isNew.value) {
      await store.createModule(editing.value)
    } else {
      await store.updateModule(editing.value.id!, editing.value)
    }
    showModal.value = false
    editing.value = {}
  } catch (error) {
    console.error('Error saving module:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(id: string) {
  if (confirm('¿Estás seguro de eliminar este módulo?')) {
    await store.deleteModule(id)
  }
}

async function togglePublish(mod: Module) {
  await store.updateModule(mod.id, { published: !mod.published })
}

const getCategoryName = (id: string) => store.categories.find(c => c.id === id)?.name || 'Sin categoría'

onMounted(() => {
  if (store.modules.length === 0) store.fetchAllData()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-foreground">Módulos</h2>
        <p class="text-sm text-muted-foreground">Grupos de lecciones organizados por categorías.</p>
      </div>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
      >
        <Plus class="w-4 h-4" />
        Nuevo Módulo
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 class="w-8 h-8 animate-spin mb-2" />
      <p>Cargando módulos...</p>
    </div>

    <!-- List -->
    <div v-else class="grid gap-3">
      <div
        v-for="mod in store.modules"
        :key="mod.id"
        class="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors group"
      >
        <div class="cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical class="w-4 h-4 text-muted-foreground" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-bold text-sm text-foreground">{{ mod.name }}</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
              {{ getCategoryName(mod.categoryId) }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground truncate">{{ mod.shortDescription || 'Sin descripción' }}</p>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="togglePublish(mod)"
            class="p-2 rounded-lg transition-all"
            :class="mod.published ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
          >
            <Eye v-if="mod.published" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
          <button
            @click="startEdit(mod)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Edit class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(mod.id)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="store.modules.length === 0" class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
        <p class="text-muted-foreground">No hay módulos registrados.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal
      :show="showModal"
      :title="isNew ? 'Nuevo Módulo' : 'Editar Módulo'"
      @close="showModal = false"
    >
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre del Módulo</label>
            <input
              v-model="editing.name"
              placeholder="Ej: Fundamentos de Seguridad"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Categoría</label>
            <select
              v-model="editing.categoryId"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none appearance-none cursor-pointer"
            >
              <option value="" disabled>Selecciona una categoría</option>
              <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción Corta</label>
            <input
              v-model="editing.shortDescription"
              placeholder="Una breve frase introductoria..."
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción Detallada</label>
            <textarea
              v-model="editing.longDescription"
              rows="4"
              placeholder="Contenido extendido del módulo..."
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
          {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Módulo' : 'Guardar Cambios') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
