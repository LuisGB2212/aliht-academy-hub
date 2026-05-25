<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { apiRepository } from '@/utils/apiRepository'
import { Loader2, Users, Trophy, BookOpen, Layers, Search, RefreshCw, FileText, CheckCircle2, XCircle, X } from 'lucide-vue-next'
import { AcademyPlatformStatistics, EvaluationResultResponse, TopUserStat } from '@/types/academy-type'

const stats = ref<AcademyPlatformStatistics | null>(null)
const loading = ref(true)
const selectedAgencyId = ref<string>('')
const searchQuery = ref('')
const currentSubTab = ref<'agencies' | 'users' | 'modules' | 'lessons'>('users')
const allAgencies = ref<any[]>([])

// ─── Evaluation results modal ──────────────────────────────────────────────
const showEvalModal = ref(false)
const evalModalLoading = ref(false)
const evalModalUser = ref<TopUserStat | null>(null)
const evalModalResults = ref<EvaluationResultResponse[]>([])
const evalModalTab = ref<'detail' | 'all'>('detail')

// Resultado activo en el tab de detalle (puede ser cualquiera de la lista, no solo el del usuario original)
const selectedDetailResult = ref<any | null>(null)

async function openEvalResults(user: TopUserStat) {
    if (!user.evaluation_id) return
    evalModalUser.value = user
    evalModalResults.value = []
    selectedDetailResult.value = null
    evalModalTab.value = 'detail'
    showEvalModal.value = true
    evalModalLoading.value = true
    try {
        const res = await apiRepository.get<any[]>({
            endpoint: `/academy/evaluations/${user.evaluation_id}/results`,
        })
        if (res?.success) {
            evalModalResults.value = res.data
            // Apuntar al resultado más reciente del usuario clickeado como punto de entrada
            selectedDetailResult.value = res.data.find((r: any) => r.user_id === user.user_id) ?? res.data[0] ?? null
        }
    } catch (e) {
        console.error('Error fetching eval results:', e)
    } finally {
        evalModalLoading.value = false
    }
}

function viewDetail(result: any) {
    selectedDetailResult.value = result
    evalModalTab.value = 'detail'
}

function closeEvalModal() {
    showEvalModal.value = false
    evalModalUser.value = null
    evalModalResults.value = []
    selectedDetailResult.value = null
}

// Determina el estado visual de una opción según si es correcta y si el usuario la eligió
function getOptionState(questionId: string, optionId: string, isCorrect?: boolean): 'correct-selected' | 'correct-missed' | 'wrong-selected' | 'neutral' {
    const userSelected = (selectedDetailResult.value?.answers?.[questionId] ?? []).includes(optionId)
    if (isCorrect && userSelected) return 'correct-selected'
    if (isCorrect && !userSelected) return 'correct-missed'
    if (!isCorrect && userSelected) return 'wrong-selected'
    return 'neutral'
}

async function fetchStats() {
    loading.value = true
    try {
        const params: Record<string, any> = {}
        if (selectedAgencyId.value) {
            params.agency_id = selectedAgencyId.value
        }

        const res = await apiRepository.get<AcademyPlatformStatistics>({
            endpoint: '/academy/progress/stats',
            params
        })

        if (res && res.success) {
            stats.value = res.data
            // Store the full list of agencies only on the initial load (when no agency is selected)
            if (!selectedAgencyId.value && res.data.by_agency) {
                allAgencies.value = res.data.by_agency
            }
        }
    } catch (e) {
        console.error('Error fetching progress stats:', e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchStats()
})

// Filtering lists
const filteredAgencies = computed(() => {
    if (!stats.value?.by_agency) return []
    return stats.value.by_agency.filter((agency: any) =>
        agency.agency_name?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

const filteredUsers = computed(() => {
    if (!stats.value?.top_users) return []
    return stats.value.top_users.filter((user: any) =>
        user.user_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        user.agency_name?.toLowerCase().includes(searchQuery.value.toLowerCase())
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
</script>

<template>
    <div class="space-y-6 animate-fade-in">
        <!-- Controls & Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-foreground">Progreso y Estadísticas</h2>
                <p class="text-sm text-muted-foreground">Analiza el avance de los usuarios y agencias en la academia.
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <!-- Agency Filter -->
                <div class="flex items-center gap-2">
                    <label class="text-xs font-bold text-muted-foreground uppercase">Filtrar:</label>
                    <select v-model="selectedAgencyId" @change="fetchStats"
                        class="px-3 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Todas las Agencias</option>
                        <option v-for="agency in allAgencies" :key="agency.agency_id" :value="agency.agency_id">
                            {{ agency.agency_name }}
                        </option>
                    </select>
                </div>

                <button @click="fetchStats" :disabled="loading"
                    class="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                    <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
                </button>
            </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="loading && !stats" class="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 class="w-10 h-10 animate-spin mb-3 text-primary" />
            <p class="font-medium">Obteniendo información del progreso...</p>
        </div>

        <div v-else-if="stats" class="space-y-6">
            <!-- Summary metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users class="w-6 h-6" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Agencias con
                            Progreso</p>
                        <p class="text-2xl font-bold text-foreground">{{ stats.by_agency?.length || 0 }}</p>
                    </div>
                </div>
                <div class="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <BookOpen class="w-6 h-6" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Usuarios Activos
                        </p>
                        <p class="text-2xl font-bold text-foreground">{{ new Set(stats.top_users?.map(u => u.user_id)).size || 0 }}</p>
                    </div>
                </div>
                <div class="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Layers class="w-6 h-6" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Módulos
                            Completados</p>
                        <p class="text-2xl font-bold text-foreground">{{ stats.module_completions?.length || 0 }}</p>
                    </div>
                </div>
                <div class="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center text-success">
                        <Trophy class="w-6 h-6" />
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Lecciones
                            Completadas</p>
                        <p class="text-2xl font-bold text-foreground">{{ stats.top_lessons?.length }}</p>
                    </div>
                </div>
            </div>

            <!-- Sub Tabs -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-px gap-4">
                <div class="flex flex-wrap gap-1">
                    <button @click="currentSubTab = 'users'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Progreso de Usuarios
                    </button>
                    <button @click="currentSubTab = 'agencies'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'agencies' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Progreso por Agencia
                    </button>
                    <button @click="currentSubTab = 'modules'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'modules' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Avance de Módulos
                    </button>
                    <button @click="currentSubTab = 'lessons'"
                        class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
                        :class="currentSubTab === 'lessons' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
                        Avance de Lecciones
                    </button>
                </div>

                <!-- Search -->
                <div class="relative w-full sm:w-64">
                    <Search class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input v-model="searchQuery" placeholder="Buscar..."
                        class="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
            </div>

            <!-- Table sections -->
            <div class="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xs">
                <!-- Users Tab -->
                <div v-if="currentSubTab === 'users'" class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-muted/40 border-b border-border/50">
                                <th class="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                                <th class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Progreso módulos</th>
                                <th class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Lecciones</th>
                                <th class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lecciones Completadas</th>
                                <th class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Agencia</th>
                                <th class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Evaluación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="user in filteredUsers" :key="user.user_id"
                                class="hover:bg-muted/20 transition-colors">
                                <td class="p-2">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                            {{ user.user_name?.charAt(0).toUpperCase() }}
                                        </div>
                                        <div>
                                            <p class="font-bold text-sm text-foreground">{{ user.user_name }}</p>
                                            <p class="text-xs text-muted-foreground mt-1">{{ user.user_email }}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-2 text-sm text-muted-foreground">
                                    <div class="items-center gap-2">
                                        <p class="text-xs text-foreground mt-1">{{ user.module_name }}</p>
                                        <div class="">
                                            <div class="flex justify-between text-[10px] text-foreground mb-1.5">
                                                <span>{{ (user.module_lessons_total ?? 0) == user.total_completed ? 'Finalizado' : 'En progreso'}}</span>
                                                <span>{{ user.total_completed }} / {{ user.module_lessons_total }}</span>
                                            </div>
                                            <div class="w-full h-1.5 bg-success/10 rounded-full overflow-hidden">
                                                <div
                                                    class="h-full gradient-bg rounded-full transition-all duration-500"
                                                    :style="{
                                                        width: user.total_completed
                                                            ? `${(user.total_completed / (user.module_lessons_total ?? 0)) * 100}%`
                                                            : '0%'
                                                    }" />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-2 font-semibold text-sm text-green-600">{{ user.total_completed }} lecciones</td>
                                <td class="p-2 font-medium text-sm text-info">
                                    <div class="flex flex-col gap-1">
                                        <div v-for="lesson in user.lessons" :key="lesson.lesson_id"
                                            class="flex items-center gap-1.5">
                                            <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            <span class="text-sm">{{ lesson.lesson_title }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-2">
                                    <span v-if="user.agency_name" class="text-xs px-2.5 py-1 rounded-full font-bold uppercase"
                                        style="background-color: hsla(16, 85%, 55%, 0.1); color: hsl(16, 85%, 55%)">
                                        {{ user.agency_name }}
                                    </span>
                                </td>
                                <!-- Acciones: botón de evaluación -->
                                <td class="p-2 text-center">
                                    <template v-if="user.has_evaluation">
                                        <button v-if="user.has_evaluation_result"
                                            @click="openEvalResults(user)"
                                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                                            :class="user.evaluation_passed
                                                ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                                                : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'"
                                            :title="`Ver resultado de evaluación — ${user.evaluation_score}%`">
                                            <FileText class="w-3.5 h-3.5" />
                                            {{ user.evaluation_score }}%
                                        </button>
                                        <span v-else class="text-xs text-muted-foreground italic">Pendiente</span>
                                    </template>
                                    <span v-else class="text-xs text-muted-foreground/40">—</span>
                                </td>
                            </tr>
                            <tr v-if="filteredUsers.length === 0">
                                <td colspan="6" class="p-8 text-center text-muted-foreground">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Agencies Tab -->
                <div v-if="currentSubTab === 'agencies'" class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-muted/40 border-b border-border/50">
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Agencia</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Usuarios con Progreso</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Lecciones Completadas</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Progreso Visual</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="agency in filteredAgencies" :key="agency.agency_id"
                                class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <p class="font-bold text-sm text-foreground">{{ agency.agency_name }}</p>
                                    <p class="text-[10px] text-muted-foreground font-mono">ID: {{ agency.agency_id }}
                                    </p>
                                </td>
                                <td class="p-4 text-center text-sm font-semibold text-foreground">
                                    {{ agency.users_with_progress }}
                                </td>
                                <td class="p-4 text-center text-sm font-bold text-primary">
                                    {{ agency.total_completions }}
                                </td>
                                <td class="p-4 max-w-xs">
                                    <div class="flex items-center gap-2">
                                        <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <!-- Dynamically scale progress comparison to the top agency -->
                                            <div class="h-full gradient-bg rounded-full"
                                                :style="`width: ${Math.min(100, Math.round((agency.total_completions / Math.max(1, stats.by_agency[0]?.total_completions || 1)) * 100))}%`">
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="filteredAgencies.length === 0">
                                <td colspan="4" class="p-8 text-center text-muted-foreground">
                                    No se encontraron agencias.
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
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Usuarios que lo finalizados</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Agencias representadas</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border/40">
                            <tr v-for="mod in filteredModules" :key="mod.module_id"
                                class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <p class="font-bold text-sm text-foreground">{{ mod.module || 'Módulo Desconocido'}}</p>
                                    <p class="text-[10px] text-muted-foreground font-mono">ID: {{ mod.module_id }}</p>
                                </td>
                                <td class="p-4 text-center text-sm font-semibold text-foreground">
                                    {{ mod.total_users }} usuarios
                                </td>
                                <td class="p-4 text-center text-sm font-semibold text-foreground">
                                    {{ mod.total_agencies }} agencias
                                </td>
                            </tr>
                            <tr v-if="filteredModules.length === 0">
                                <td colspan="3" class="p-8 text-center text-muted-foreground">
                                    No se encontraron módulos finalizados.
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
                            <tr v-for="lesson in filteredLessons" :key="lesson.lesson_id"
                                class="hover:bg-muted/20 transition-colors">
                                <td class="p-4">
                                    <p class="text-[10px] text-muted-foreground font-mono">ID: {{ lesson.lesson_id }}</p>
                                    <p class="font-bold text-sm text-foreground">{{ lesson.lesson || 'Lección Desconocida' }}</p>
                                </td>
                                <td class="p-4 text-center text-sm font-bold text-primary">
                                    {{ lesson.total_completed }} veces
                                </td>
                            </tr>
                            <tr v-if="filteredLessons.length === 0">
                                <td colspan="2" class="p-8 text-center text-muted-foreground">
                                    No se encontraron lecciones.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>

    <!-- ═══ Evaluation Results Modal ═══════════════════════════════════════════ -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="showEvalModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeEvalModal" />

                <div class="relative z-10 w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-4 border-b border-border/50 shrink-0">
                            <div>
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                                    Evaluación · {{ evalModalUser?.module_name }}
                                </p>
                                <h2 class="text-base font-bold text-foreground">
                                    {{ selectedDetailResult?.evaluation?.title ?? 'Resultado de Evaluación' }}
                                </h2>
                            </div>
                            <button @click="closeEvalModal" class="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                                <X class="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        <!-- Loading -->
                        <div v-if="evalModalLoading" class="flex items-center justify-center py-16">
                            <Loader2 class="w-6 h-6 animate-spin text-primary" />
                        </div>

                        <template v-else>
                            <!-- User result card + Tabs -->
                            <div class="px-6 pt-4 shrink-0">
                                <!-- Selected user card -->
                                <div v-if="selectedDetailResult"
                                    class="flex items-center gap-4 p-3 rounded-2xl border mb-4"
                                    :class="selectedDetailResult.passed
                                        ? 'bg-success/5 border-success/20'
                                        : 'bg-destructive/5 border-destructive/20'">
                                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                        {{ selectedDetailResult.user_name?.charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-sm text-foreground truncate">{{ selectedDetailResult.user_name }}</p>
                                        <p class="text-[10px] text-muted-foreground truncate">{{ selectedDetailResult.user_email }}</p>
                                    </div>
                                    <!-- Score ring -->
                                    <div class="text-center shrink-0">
                                        <p class="text-2xl font-black leading-none"
                                            :class="selectedDetailResult.passed ? 'text-success' : 'text-destructive'">
                                            {{ selectedDetailResult.score }}%
                                        </p>
                                        <p class="text-[9px] font-semibold uppercase tracking-wider mt-0.5"
                                            :class="selectedDetailResult.passed ? 'text-success' : 'text-destructive'">
                                            {{ selectedDetailResult.passed ? 'Aprobado' : 'No aprobado' }}
                                        </p>
                                    </div>
                                    <div class="shrink-0">
                                        <CheckCircle2 v-if="selectedDetailResult.passed" class="w-7 h-7 text-success" />
                                        <XCircle v-else class="w-7 h-7 text-destructive" />
                                    </div>
                                </div>

                                <!-- Tabs -->
                                <div class="flex gap-1 border-b border-border/50 -mx-1 px-1">
                                    <button @click="evalModalTab = 'detail'"
                                        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all"
                                        :class="evalModalTab === 'detail'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'">
                                        Detalle de Respuestas
                                    </button>
                                    <button @click="evalModalTab = 'all'"
                                        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all"
                                        :class="evalModalTab === 'all'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'">
                                        Todos los Resultados
                                        <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
                                            {{ evalModalResults.length }}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <!-- ═══ TAB: Detalle de Respuestas ══════════════════ -->
                            <div v-if="evalModalTab === 'detail'" class="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                                <div v-if="!selectedDetailResult" class="text-center py-12 text-muted-foreground">
                                    <FileText class="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p class="font-medium text-sm">Sin datos de respuestas.</p>
                                </div>

                                <template v-else>
                                    <!-- Leyenda -->
                                    <div class="flex flex-wrap gap-2 text-[10px] font-semibold">
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success">
                                            <CheckCircle2 class="w-3 h-3" /> Correcta seleccionada
                                        </span>
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-success/60 border border-success/20">
                                            <CheckCircle2 class="w-3 h-3" /> Correcta no seleccionada
                                        </span>
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive">
                                            <XCircle class="w-3 h-3" /> Incorrecta seleccionada
                                        </span>
                                    </div>

                                    <!-- Questions -->
                                    <div v-for="(q, qi) in (selectedDetailResult?.evaluation?.questions ?? [])" :key="q.id"
                                        class="rounded-2xl border border-border/50 overflow-hidden">

                                        <!-- Question header -->
                                        <div class="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                                            <span class="shrink-0 w-6 h-6 rounded-full gradient-bg text-primary-foreground text-[10px] font-bold flex items-center justify-center mt-0.5">
                                                {{ Number(qi) + 1 }}
                                            </span>
                                            <div class="flex-1">
                                                <p class="text-sm font-semibold text-foreground">{{ q.question }}</p>
                                                <p class="text-[10px] text-muted-foreground mt-0.5">
                                                    {{ q.type === 'multiple_choice' ? 'Selección múltiple' : q.type === 'true_false' ? 'Verdadero / Falso' : 'Opción única' }}
                                                </p>
                                            </div>
                                            <!-- Question result badge -->
                                            <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                :class="q.options.every((o: any) =>
                                                    (o.correct && (selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id)) ||
                                                    (!o.correct && !(selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id))
                                                )
                                                    ? 'bg-success/10 text-success'
                                                    : 'bg-destructive/10 text-destructive'">
                                                {{ q.options.every((o: any) =>
                                                    (o.correct && (selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id)) ||
                                                    (!o.correct && !(selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id))
                                                ) ? '✓ Correcta' : '✗ Incorrecta' }}
                                            </span>
                                        </div>

                                        <!-- Options -->
                                        <div class="p-3 space-y-2">
                                            <div v-for="opt in q.options" :key="opt.id"
                                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all"
                                                :class="{
                                                    'bg-success/10 border-success/30 text-success': getOptionState(q.id, opt.id, opt.correct) === 'correct-selected',
                                                    'bg-muted/30 border-success/20 text-success/60': getOptionState(q.id, opt.id, opt.correct) === 'correct-missed',
                                                    'bg-destructive/10 border-destructive/30 text-destructive': getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected',
                                                    'bg-transparent border-border/40 text-muted-foreground': getOptionState(q.id, opt.id, opt.correct) === 'neutral',
                                                }">
                                                <!-- State icon -->
                                                <span class="shrink-0 w-5 h-5 flex items-center justify-center">
                                                    <CheckCircle2 v-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-selected'" class="w-4 h-4" />
                                                    <CheckCircle2 v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-missed'" class="w-4 h-4 opacity-40" />
                                                    <XCircle v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected'" class="w-4 h-4" />
                                                    <span v-else class="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20 inline-block" />
                                                </span>
                                                <span class="flex-1 font-medium">{{ opt.text }}</span>
                                                <!-- Labels -->
                                                <span v-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-selected'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                                                    Tu respuesta · Correcta
                                                </span>
                                                <span v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-missed'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider opacity-60">
                                                    Respuesta correcta
                                                </span>
                                                <span v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                                                    Tu respuesta · Incorrecta
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Metadata footer -->
                                    <p class="text-xs text-muted-foreground text-center pt-1">
                                        Respondido el {{ selectedDetailResult.completed_at
                                            ? new Date(selectedDetailResult.completed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : '—' }}
                                        · Puntaje mínimo requerido: <strong>{{ selectedDetailResult.evaluation?.passing_score }}%</strong>
                                    </p>
                                </template>
                            </div>

                            <!-- ═══ TAB: Todos los Resultados ═════════════════════ -->
                            <div v-if="evalModalTab === 'all'" class="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                                <!-- Empty -->
                                <div v-if="evalModalResults.length === 0" class="text-center py-12 text-muted-foreground">
                                    <FileText class="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p class="font-medium text-sm">Sin resultados aún.</p>
                                </div>

                                <template v-else>
                                    <!-- Summary chips -->
                                    <div class="flex flex-wrap gap-2">
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-semibold text-foreground">
                                            {{ evalModalResults.length }} resultado{{ evalModalResults.length !== 1 ? 's' : '' }}
                                        </span>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                                            <CheckCircle2 class="w-3.5 h-3.5" />
                                            {{ evalModalResults.filter(r => r.passed).length }} aprobaron
                                        </span>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                                            <XCircle class="w-3.5 h-3.5" />
                                            {{ evalModalResults.filter(r => !r.passed).length }} no aprobaron
                                        </span>
                                    </div>

                                    <!-- Results list -->
                                    <div class="rounded-2xl border border-border/50 overflow-hidden">
                                        <table class="w-full text-left border-collapse">
                                            <thead>
                                                <tr class="bg-muted/40 border-b border-border/50">
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Agencia</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Puntaje</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-border/40">
                                                <tr v-for="result in evalModalResults" :key="result.id"
                                                    class="hover:bg-muted/20 transition-colors"
                                                    :class="result.user_id === evalModalUser?.user_id ? 'bg-primary/5' : ''">
                                                    <td class="px-4 py-3">
                                                        <div class="flex items-center gap-2">
                                                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                                {{ result.user_name?.charAt(0).toUpperCase() }}
                                                            </div>
                                                            <div>
                                                                <p class="text-sm font-semibold text-foreground leading-tight">
                                                                    {{ result.user_name }}
                                                                    <span v-if="result.user_id === evalModalUser?.user_id"
                                                                        class="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">
                                                                        seleccionado
                                                                    </span>
                                                                </p>
                                                                <p class="text-[10px] text-muted-foreground">{{ result.user_email }}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-3">
                                                        <span v-if="result.agency_name"
                                                            class="text-xs px-2 py-0.5 rounded-full font-bold"
                                                            style="background-color: hsla(16,85%,55%,0.1); color: hsl(16,85%,55%)">
                                                            {{ result.agency_name }}
                                                        </span>
                                                        <span v-else class="text-xs text-muted-foreground">—</span>
                                                    </td>
                                                    <td class="px-4 py-3 text-center font-bold text-sm"
                                                        :class="result.passed ? 'text-success' : 'text-destructive'">
                                                        {{ result.score }}%
                                                    </td>
                                                    <td class="px-4 py-3 text-center">
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                            :class="result.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'">
                                                            <CheckCircle2 v-if="result.passed" class="w-3 h-3" />
                                                            <XCircle v-else class="w-3 h-3" />
                                                            {{ result.passed ? 'Aprobado' : 'No aprobado' }}
                                                        </span>
                                                    </td>
                                                    <td class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                        {{ result.completed_at
                                                            ? new Date(result.completed_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
                                                            : '—' }}
                                                    </td>
                                                    <td class="px-4 py-3 text-center">
                                                        <button @click="viewDetail(result)"
                                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                                                            :class="selectedDetailResult?.id === result.id
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'">
                                                            <FileText class="w-3 h-3" />
                                                            Ver
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </template>
                            </div>
                        </template>

                        <!-- Footer -->
                        <div class="px-6 py-3 border-t border-border/50 bg-muted/10 shrink-0 flex justify-end">
                            <button @click="closeEvalModal"
                                class="px-6 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
