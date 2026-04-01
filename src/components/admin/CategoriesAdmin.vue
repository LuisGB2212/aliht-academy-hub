<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Category, Company } from '@/types/academy-type'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2 } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Category>>({})
const isNew = ref(false)
const isSubmitting = ref(false)

const companies: Company[] = ['aliht', 'nextravel', 'bestravel', 'todos']

function startNew() {
  isNew.value = true
  editing.value = {
    name: '',
    description: '',
    icon: 'BookOpen',
    color: '#3597d4',
    order: store.categories.length + 1,
    visibility: ['todos'],
    published: true,
  }
  showModal.value = true
}

function startEdit(cat: Category) {
  isNew.value = false
  editing.value = { ...cat }
  showModal.value = true
}

async function handleSave() {
  if (!editing.value.name) return
  
  isSubmitting.value = true
  try {
    if (isNew.value) {
      await store.createCategory(editing.value)
    } else {
      await store.updateCategory(editing.value.id!, editing.value)
    }
    showModal.value = false
    editing.value = {}
  } catch (error) {
    console.error('Error saving category:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(id: string) {
  if (confirm('¿Estás seguro de eliminar esta categoría?')) {
    await store.deleteCategory(id)
  }
}

async function togglePublish(cat: Category) {
  await store.updateCategory(cat.id, { published: !cat.published })
}

function toggleVisibility(company: Company) {
  if (!editing.value.visibility) return
  
  if (company === 'todos') {
    editing.value.visibility = ['todos']
  } else {
    const current = editing.value.visibility.filter(v => v !== 'todos')
    if (current.includes(company)) {
      editing.value.visibility = current.filter(v => v !== company)
      if (editing.value.visibility.length === 0) editing.value.visibility = ['todos']
    } else {
      editing.value.visibility = [...current, company]
    }
  }
}

const sortedCategories = () => [...store.categories].sort((a, b) => a.order - b.order)

onMounted(() => {
  if (store.categories.length === 0) store.fetchAllData()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-foreground">Categorías</h2>
        <p class="text-sm text-muted-foreground text-pretty">Gestiona las categorías principales de la academia.</p>
      </div>
      <button
        @click="startNew"
        class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
      >
        <Plus class="w-4 h-4" />
        Nueva Categoría
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 class="w-8 h-8 animate-spin mb-2" />
      <p>Cargando categorías...</p>
    </div>

    <!-- List -->
    <div v-else class="grid gap-3">
      <div
        v-for="cat in sortedCategories()"
        :key="cat.id"
        class="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors group"
      >
        <div class="cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical class="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" :style="`background-color: ${cat.color}20; color: ${cat.color}`">
          <div class="w-3 h-3 rounded-full" :style="`background-color: ${cat.color}`" />
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-sm text-foreground">{{ cat.name }}</h3>
          <p class="text-xs text-muted-foreground truncate">{{ cat.description || 'Sin descripción' }}</p>
        </div>

        <div class="hidden md:flex gap-1 items-center mr-4">
          <span 
            v-for="vis in cat.visibility" 
            :key="vis"
            class="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium uppercase"
          >
            {{ vis }}
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="togglePublish(cat)"
            class="p-2 rounded-lg transition-all"
            :class="cat.published ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
            :title="cat.published ? 'Publicado' : 'Borrador'"
          >
            <Eye v-if="cat.published" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
          <button
            @click="startEdit(cat)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Edit class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(cat.id)"
            class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="store.categories.length === 0" class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
        <p class="text-muted-foreground">No hay categorías registradas.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal
      :show="showModal"
      :title="isNew ? 'Nueva Categoría' : 'Editar Categoría'"
      @close="showModal = false"
    >
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre de la Categoría</label>
            <input
              v-model="editing.name"
              placeholder="Ej: Introducción a la Empresa"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none"
            />
          </div>
          
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Color Identificador</label>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                v-model="editing.color"
                class="w-12 h-10 rounded-lg border border-input p-1 cursor-pointer bg-background"
              />
              <input
                v-model="editing.color"
                class="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Orden de Visualización</label>
            <input
              type="number"
              v-model.number="editing.order"
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción</label>
            <textarea
              v-model="editing.description"
              rows="3"
              placeholder="Breve descripción para orientar al colaborador..."
              class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Visibilidad por Empresa</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in companies"
                :key="c"
                @click="toggleVisibility(c)"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                :class="editing.visibility?.includes(c) 
                  ? 'gradient-bg text-primary-foreground border-transparent shadow-md shadow-primary/20' 
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'"
              >
                {{ c.toUpperCase() }}
              </button>
            </div>
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
          {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Categoría' : 'Guardar Cambios') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
