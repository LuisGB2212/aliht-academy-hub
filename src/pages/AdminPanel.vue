<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { BookOpen, Layers, FileText, Shield } from 'lucide-vue-next'
import PlatformsAdmin from '@/components/admin/PlatformsAdmin.vue'
import ModulesAdmin from '@/components/admin/ModulesAdmin.vue'
import LessonsAdmin from '@/components/admin/LessonsAdmin.vue'

const store = useLmsStore()
type AdminTab = 'plataformas' | 'funcionalidades' | 'tutoriales'
const tab = ref<AdminTab>('plataformas')

const tabs = [
    { key: 'plataformas' as AdminTab, label: 'Plataformas', icon: BookOpen, count: () => store.platforms.length },
    { key: 'funcionalidades' as AdminTab, label: 'Funcionalidades', icon: Layers, count: () => store.modules.length },
    { key: 'tutoriales' as AdminTab, label: 'Tutoriales', icon: FileText, count: () => store.lessons.length },
]
const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
    <div class="w-full mx-auto px-4 py-8 md:px-6">
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Panel de <span class="gradient-text">Administración</span>
                    </h1>
                    <p class="text-muted-foreground">
                        Gestiona el contenido de la Academia Aliht Corporativo.
                    </p>
                </div>
                <div class="mb-6 flex justify-end">
                    <RouterLink to="/" class="text-primary font-bold bg-primary/30 hover:bg-primary/80 hover:text-primary-foreground p-2 pl-4 pr-4 rounded-lg cursor-pointer flex items-center gap-2">
                        <ArrowLeft class="w-4 h-4" /> Volver al inicio
                    </RouterLink>
                </div>
            </div>
        </div>


        <!-- Tabs -->
        <div class="flex gap-2 mb-6 border-b border-border pb-3">
            <button v-for="t in tabs" :key="t.key" @click="tab = t.key"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" :class="tab === t.key
                    ? 'gradient-bg text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'" type="button">
                <component :is="t.icon" class="w-4 h-4" />
                {{ t.label }}
                <span class="text-xs px-1.5 py-0.5 rounded-full" :class="tab === t.key ? 'bg-white/20' : 'bg-muted'">{{
                    t.count() }}</span>
            </button>
        </div>

        <PlatformsAdmin v-if="tab === 'plataformas'" />
        <ModulesAdmin v-if="tab === 'funcionalidades'" />
        <LessonsAdmin v-if="tab === 'tutoriales'" />
    </div>
</template>
