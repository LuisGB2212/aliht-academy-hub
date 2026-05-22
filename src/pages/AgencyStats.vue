<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiRepository } from '@/utils/apiRepository'
import { 
    Loader2, Users, Trophy, Layers, 
    ArrowLeft, ShieldAlert, Search, RefreshCw
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const stats = ref<any>(null)
const loading = ref(true)
const searchQuery = ref('')
const currentSubTab = ref<'users' | 'modules' | 'lessons'>('users')

const hasAccess = computed(() => {
    return authStore.user?.agency_id && authStore.user?.view_stats === true
})

async function fetchStats() {
    if (!hasAccess.value) {
        loading.value = false
        return
    }
    
    loading.value = true
    try {
        const res = await apiRepository.get<any>({
            endpoint: '/academy/progress/stats',
            params: { agency_id: authStore.user?.agency_id }
        })
        
        if (res && res.success) {
            stats.value = res.data
        }
    } catch (e) {
        console.error('Error fetching agency progress stats:', e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchStats()
})

// Calculate total completions for the agency from members data
const totalAgencyCompletions = computed(() => {
    if (!stats.value?.top_users) return 0
    return stats.value.top_users.reduce((acc: number, curr: any) => acc + Number(curr.total_completed || 0), 0)
})

const totalAgencyUsersWithProgress = computed(() => {
    if (!stats.value?.top_users) return 0
    return stats.value.top_users.length
})

// Filtering lists
const filteredUsers = computed(() => {
    if (!stats.value?.top_users) return []
    return stats.value.top_users.filter((user: any) => 
        user.user_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

const filteredModules = computed(() => {
    if (!stats.value?.module_completions) return []
    return stats.value.module_completions.filter((mod: any) => 
        mod.module?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

const filteredLessons = computed(() => {
    if (!stats.value?.top_lessons) return []
    return stats.value.top_lessons.filter((lesson: any) => 
        lesson.lesson?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

function goBack() {
    router.back()
}
</script>

<template>
    <div class="w-full mx-auto px-4 py-8 md:px-16 animate-fade-in">
        
        <!-- Unauthorized state -->
        <div v-if="!hasAccess && !authStore.loading" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4">
                <ShieldAlert class="w-8 h-8" />
            </div>
            <h1 class="text-2xl font-bold text-foreground mb-2">Acceso Denegado</h1>
            <p class="text-muted-foreground max-w-md mb-6">
                No tienes los permisos requeridos o no perteneces a una agencia autorizada para ver esta sección.
            </p>
            <button @click="goBack" class="px-6 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20">
                Volver
            </button>
        </div>

        <div v-else-if="loading && !stats" class="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 class="w-12 h-12 animate-spin mb-4 text-primary" />
            <p class="font-medium text-lg">Cargando estadísticas de la agencia...</p>
        </div>

        <div v-else-if="stats" class="space-y-8">
            <!-- Header and Navigation -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <span class="text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-2 block">
                        Estadísticas de la Agencia
                    </span>
                    <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-1">
                        Portal de <span class="gradient-text">{{ authStore.user?.agency_name }}</span>
                    </h1>
                    <p class="text-muted-foreground text-sm">
                        Monitorea el avance de los miembros de tu equipo en la academia.
                    </p>
                </div>
                
                <div class="flex items-center gap-3">
                    <button @click="fetchStats" :disabled="loading"
                        class="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        title="Actualizar">
                        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
                    </button>
                    
                    <button @click="goBack" class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-primary bg-primary/10 hover:bg-primary/20">
                        <ArrowLeft class="w-4 h-4" /> Regresar
                    </button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <!-- Card 1 -->
                <div class="bg-card rounded-2xl p-6 border border-border/50 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
                    <div class="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Users class="w-7 h-7" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Miembros de la Agencia</p>
                        <p class="text-3xl font-bold text-foreground">{{ totalAgencyUsersWithProgress }}</p>
                    </div>
                </div>

                <!-- Card 2 -->
                <div class="bg-card rounded-2xl p-6 border border-border/50 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Trophy class="w-7 h-7" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Lecciones Completadas</p>
                        <p class="text-3xl font-bold text-foreground">{{ totalAgencyCompletions }}</p>
                    </div>
                </div>

                <!-- Card 3 -->
                <div class="bg-card rounded-2xl p-6 border border-border/50 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
                    <div class="w-14 h-14 rounded-2xl bg-success-light flex items-center justify-center text-success">
                        <Layers class="w-7 h-7" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Módulos Finalizados</p>
                        <p class="text-3xl font-bold text-foreground">{{ stats.module_completions?.length || 0 }}</p>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-px gap-4">
                <div class="flex flex-wrap gap-1">
                    <button @click="currentSubTab = 'users'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Miembros del Equipo
                    </button>
                    <button @click="currentSubTab = 'modules'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'modules' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Módulos Completados
                    </button>
                    <button @click="currentSubTab = 'lessons'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'lessons' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Lecciones Populares
                    </button>
                </div>

                <!-- Search -->
                <div class="relative w-full sm:w-64">
                    <Search class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input v-model="searchQuery" placeholder="Buscar por nombre..."
                        class="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
            </div>

            <!-- Content Area -->
            <div class="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xs">
                
                <!-- Members Tab -->
                <div v-if="currentSubTab === 'users'" class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-muted/40 border-b border-border/50">
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Miembro</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Avance en la Academia</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Progreso Visual</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                            {{ user.user_name?.charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="font-bold text-sm text-foreground">{{ user.user_name }}</span>
                                    </div>
                                </td>
                                <td class="p-4 text-sm text-muted-foreground">
                                    {{ user.user_email }}
                                </td>
                                <td class="p-4 text-center font-bold text-sm text-success">
                                    {{ user.total_completed }} lecciones
                                </td>
                                <td class="p-4">
                                    <div class="flex items-center gap-2 max-w-[200px]">
                                        <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <div class="h-full gradient-bg rounded-full"
                                                :style="`width: ${Math.min(100, Math.round((user.total_completed / Math.max(1, stats.top_users[0]?.total_completed || 1)) * 100))}%`">
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="filteredUsers.length === 0">
                                <td colspan="4" class="p-8 text-center text-muted-foreground">
                                    No se encontraron miembros registrados con progreso.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Modules Tab -->
                <div v-if="currentSubTab === 'modules'" class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-muted/40 border-b border-border/50">
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Módulo</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Miembros que lo completaron</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="mod in filteredModules" :key="mod.module_id" class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <p class="font-bold text-sm text-foreground">{{ mod.module || 'Módulo Desconocido' }}</p>
                                    <p class="text-[10px] text-muted-foreground font-mono">ID: {{ mod.module_id }}</p>
                                </td>
                                <td class="p-4 text-center text-sm font-semibold text-foreground">
                                    {{ mod.total_users }} miembros
                                </td>
                            </tr>
                            <tr v-if="filteredModules.length === 0">
                                <td colspan="2" class="p-8 text-center text-muted-foreground">
                                    Ningún módulo ha sido finalizado por los miembros aún.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Lessons Tab -->
                <div v-if="currentSubTab === 'lessons'" class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-muted/40 border-b border-border/50">
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lección / Tutorial</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Completada por</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="lesson in filteredLessons" :key="lesson.lesson_id" class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <p class="font-bold text-sm text-foreground">{{ lesson.lesson || 'Lección Desconocida' }}</p>
                                    <p class="text-[10px] text-muted-foreground font-mono">ID: {{ lesson.lesson_id }}</p>
                                </td>
                                <td class="p-4 text-center text-sm font-bold text-primary">
                                    {{ lesson.total_completed }} miembros
                                </td>
                            </tr>
                            <tr v-if="filteredLessons.length === 0">
                                <td colspan="2" class="p-8 text-center text-muted-foreground">
                                    No hay lecciones completadas por los miembros.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
</template>
