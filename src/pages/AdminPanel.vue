<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { BookOpen, Layers, FileText, Shield } from 'lucide-vue-next'
import CategoriesAdmin from '@/components/admin/CategoriesAdmin.vue'
import ModulesAdmin from '@/components/admin/ModulesAdmin.vue'
import LessonsAdmin from '@/components/admin/LessonsAdmin.vue'

const store = useLmsStore()
type AdminTab = 'categorias' | 'modulos' | 'lecciones'
const tab = ref<AdminTab>('categorias')

const tabs = [
  { key: 'categorias' as AdminTab, label: 'Categorías', icon: BookOpen, count: () => store.categories.length },
  { key: 'modulos' as AdminTab, label: 'Módulos', icon: Layers, count: () => store.modules.length },
  { key: 'lecciones' as AdminTab, label: 'Lecciones', icon: FileText, count: () => store.lessons.length },
]
const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="w-full mx-auto">
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-2">Panel de Administración</h1>
          <p class="text-muted-foreground text-sm">Gestiona el contenido de la Academia Aliht Corporativo.</p>
        </div>
        <RouterLink :to="isAdmin ? '/' : '/admin'"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-secondary/90 hover:text-foreground transition-all">
          <Shield class="w-4 h-4" />
          <span class="hidden sm:inline">{{ isAdmin ? 'Vista de Usuario' : 'Panel Admin' }}</span>
        </RouterLink>
      </div>

    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-border pb-3">
      <button v-for="t in tabs" :key="t.key" @click="tab = t.key"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" :class="tab === t.key
          ? 'gradient-bg text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'">
        <component :is="t.icon" class="w-4 h-4" />
        {{ t.label }}
        <span class="text-xs px-1.5 py-0.5 rounded-full" :class="tab === t.key ? 'bg-white/20' : 'bg-muted'">{{
          t.count() }}</span>
      </button>
    </div>

    <CategoriesAdmin v-if="tab === 'categorias'" />
    <ModulesAdmin v-if="tab === 'modulos'" />
    <LessonsAdmin v-if="tab === 'lecciones'" />
  </div>
</template>
