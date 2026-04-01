<script setup lang="ts">
import { ref } from 'vue'
import { useLmsStore } from '@/stores/lms'
import type { Module } from '@/types/lms'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-vue-next'

const store = useLmsStore()
const editing = ref<Module | null>(null)
const isNew = ref(false)

function startNew() {
  isNew.value = true
  editing.value = {
    id: `mod-${Date.now()}`,
    categoryId: store.categories[0]?.id || '',
    name: '',
    shortDescription: '',
    longDescription: '',
    order: store.modules.length + 1,
    published: false,
  }
}

function handleSave() {
  if (!editing.value) return
  if (isNew.value) {
    store.modules.push(editing.value)
  } else {
    const idx = store.modules.findIndex(m => m.id === editing.value!.id)
    if (idx !== -1) store.modules[idx] = { ...editing.value }
  }
  editing.value = null
  isNew.value = false
}

function togglePublish(id: string) {
  const mod = store.modules.find(m => m.id === id)
  if (mod) mod.published = !mod.published
}

function sortedModules() {
  return [...store.modules].sort((a, b) => a.order - b.order)
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-foreground">Módulos</h2>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium"
      >
        <Plus class="w-4 h-4" />
        Nuevo Módulo
      </button>
    </div>

    <!-- Form -->
    <div v-if="editing" class="bg-card rounded-xl border border-border p-5 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
          <input v-model="editing.name" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
          <select v-model="editing.categoryId" class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
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
        v-for="mod in sortedModules()"
        :key="mod.id"
        class="flex items-center gap-3 bg-card rounded-lg border border-border p-4"
      >
        <GripVertical class="w-4 h-4 text-muted-foreground opacity-40 cursor-grab" />
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-foreground">{{ mod.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ store.categories.find(c => c.id === mod.categoryId)?.name }} · {{ mod.shortDescription }}
          </p>
        </div>
        <button
          @click="togglePublish(mod.id)"
          class="p-2 rounded-lg transition-colors"
          :class="mod.published ? 'text-success hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'"
        >
          <Eye v-if="mod.published" class="w-4 h-4" />
          <EyeOff v-else class="w-4 h-4" />
        </button>
        <button @click="editing = { ...mod }" class="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Edit class="w-4 h-4" />
        </button>
        <button
          @click="store.modules.splice(store.modules.findIndex(m => m.id === mod.id), 1)"
          class="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
