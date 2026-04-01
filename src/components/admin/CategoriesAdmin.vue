<script setup lang="ts">
import { ref } from 'vue'
import { useLmsStore } from '@/stores/lms'
import type { Category, Company } from '@/types/lms'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-vue-next'

const store = useLmsStore()
const editing = ref<Category | null>(null)
const isNew = ref(false)

const companies: Company[] = ['aliht', 'nextravel', 'bestravel', 'todos']

function startNew() {
  isNew.value = true
  editing.value = {
    id: `cat-${Date.now()}`,
    name: '',
    description: '',
    icon: 'BookOpen',
    color: '#3597d4',
    order: store.categories.length + 1,
    visibility: ['todos'],
    published: false,
  }
}

function handleSave() {
  if (!editing.value) return
  if (isNew.value) {
    store.categories.push(editing.value)
  } else {
    const idx = store.categories.findIndex(c => c.id === editing.value!.id)
    if (idx !== -1) store.categories[idx] = { ...editing.value }
  }
  editing.value = null
  isNew.value = false
}

function handleDelete(id: string) {
  const idx = store.categories.findIndex(c => c.id === id)
  if (idx !== -1) store.categories.splice(idx, 1)
}

function togglePublish(id: string) {
  const cat = store.categories.find(c => c.id === id)
  if (cat) cat.published = !cat.published
}

function toggleVisibility(company: Company) {
  if (!editing.value) return
  if (company === 'todos') {
    editing.value.visibility = ['todos']
  } else {
    const vis = editing.value.visibility.filter(v => v !== 'todos')
    if (vis.includes(company)) {
      editing.value.visibility = vis.filter(v => v !== company)
    } else {
      editing.value.visibility = [...vis, company]
    }
  }
}

function sortedCategories() {
  return [...store.categories].sort((a, b) => a.order - b.order)
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-foreground">Categorías</h2>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium"
      >
        <Plus class="w-4 h-4" />
        Nueva Categoría
      </button>
    </div>

    <!-- Form -->
    <div v-if="editing" class="bg-card rounded-xl border border-border p-5 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
          <input
            v-model="editing.name"
            class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
          <input
            type="color"
            v-model="editing.color"
            class="w-full h-10 rounded-lg border border-input cursor-pointer"
          />
        </div>
        <div class="md:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
          <textarea
            v-model="editing.description"
            rows="2"
            class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Visibilidad</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in companies"
              :key="c"
              @click="toggleVisibility(c)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              :class="editing.visibility.includes(c) ? 'gradient-bg text-primary-foreground' : 'bg-muted text-muted-foreground'"
            >
              {{ c.charAt(0).toUpperCase() + c.slice(1) }}
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Orden</label>
          <input
            type="number"
            v-model.number="editing.order"
            class="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div class="flex gap-2 mt-4 justify-end">
        <button
          @click="editing = null; isNew = false"
          class="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >Cancelar</button>
        <button
          @click="handleSave"
          class="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium"
        >Guardar</button>
      </div>
    </div>

    <!-- List -->
    <div class="space-y-2">
      <div
        v-for="cat in sortedCategories()"
        :key="cat.id"
        class="flex items-center gap-3 bg-card rounded-lg border border-border p-4"
      >
        <GripVertical class="w-4 h-4 text-muted-foreground opacity-40 cursor-grab" />
        <div class="w-3 h-3 rounded-full shrink-0" :style="`background-color: ${cat.color}`" />
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-foreground">{{ cat.name }}</p>
          <p class="text-xs text-muted-foreground truncate">{{ cat.description }}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
          {{ cat.visibility.join(', ') }}
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="togglePublish(cat.id)"
            class="p-2 rounded-lg transition-colors"
            :class="cat.published ? 'text-success hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'"
          >
            <Eye v-if="cat.published" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
          <button
            @click="editing = { ...cat }"
            class="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Edit class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(cat.id)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
