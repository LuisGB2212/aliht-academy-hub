<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { BookOpen, Layers, FileText, ArrowLeft, Users } from 'lucide-vue-next'
import PlatformsAdmin from '@/components/admin/PlatformsAdmin.vue'
import ModulesAdmin from '@/components/admin/ModulesAdmin.vue'
import LessonsAdmin from '@/components/admin/LessonsAdmin.vue'
import UserProgressAdmin from '@/components/admin/UserProgressAdmin.vue'

const store = useLmsStore()
const route  = useRoute()
const router = useRouter()

type AdminTab = 'plataformas' | 'funcionalidades' | 'tutoriales' | 'progreso'

// ─── URL-synced tab ────────────────────────────────────────────────────────
const tabSelected = computed<AdminTab>({
    get: () => (route.query.tab as AdminTab) || 'plataformas',
    set: (v) => router.replace({ query: { ...route.query, tab: v, folder: undefined } }),
})

// ─── URL-synced folder (only relevant when tab=funcionalidades) ─────────────
const selectedFolderId = computed<number | null>({
    get: () => route.query.folder ? Number(route.query.folder) : null,
    set: (v) => router.replace({ query: { ...route.query, folder: v ?? undefined } }),
})

function setTab(tab: AdminTab) {
    // Clear folder when switching away from funcionalidades
    router.replace({ query: { tab, folder: undefined } })
}

const tabs = [
    { key: 'plataformas' as AdminTab,     label: 'Plataformas',         icon: BookOpen, count: () => store.platforms.length },
    { key: 'funcionalidades' as AdminTab, label: 'Funcionalidades',      icon: Layers,   count: () => store.modules.length },
    { key: 'tutoriales' as AdminTab,      label: 'Tutoriales',           icon: FileText, count: () => store.lessons.length },
    { key: 'progreso' as AdminTab,        label: 'Progreso de Usuarios', icon: Users,    count: () => 0 },
]

onMounted(async () => {
    await store.fetchAllData()
    await store.fetchFolders()
})
</script>

<template>
    <div class="w-full mx-auto px-4 py-8 md:px-16">
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
                    <RouterLink to="/" class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-primary font-bold bg-primary/30 hover:bg-primary/80 hover:text-primary-foreground">
                        <ArrowLeft class="w-4 h-4" /> Volver al inicio
                    </RouterLink>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-6 border-b border-border pb-3">
            <button v-for="tab in tabs" :key="tab.key" @click="setTab(tab.key)"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                :class="tabSelected === tab.key
                    ? 'gradient-bg text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                type="button">
                <component :is="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
                <span v-if="tab.key !== 'progreso'" class="text-xs px-1.5 py-0.5 rounded-full"
                    :class="tabSelected === tab.key ? 'bg-white/20' : 'bg-muted'">
                    {{ tab.count() }}
                </span>
            </button>
        </div>

        <PlatformsAdmin v-if="tabSelected === 'plataformas'" />
        <ModulesAdmin
            v-if="tabSelected === 'funcionalidades'"
            :folder-id="selectedFolderId"
            @folder-change="(id) => selectedFolderId = id"
        />
        <LessonsAdmin v-if="tabSelected === 'tutoriales'" />
        <UserProgressAdmin v-if="tabSelected === 'progreso'" />
    </div>
</template>
