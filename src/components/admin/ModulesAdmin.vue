<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Module, ModuleEvaluation, EvaluationQuestion, EvaluationOption, AcademyFolder } from '@/types/academy-type'
import { ACADEMY_PROFILES } from '@/types/academy-type'
import {
    Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2, ClipboardList,
    X, PlusCircle, CheckSquare, BrainCircuit, Users, Folder, FolderOpen,
    ChevronRight, ArrowLeft, FolderPlus
} from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import Sortable from 'sortablejs'

const props = defineProps<{
    folderId: number | null
}>()

const emit = defineEmits<{
    (e: 'folder-change', id: number | null): void
}>()

const store = useLmsStore()

// ─── Folder-level state ────────────────────────────────────────────────────
const showFolderModal  = ref(false)
const editingFolder    = ref<Partial<AcademyFolder>>({})
const isNewFolder      = ref(false)
const folderSubmitting = ref(false)
const folderListRef    = ref<HTMLElement | null>(null)

const currentFolder = computed(() =>
    props.folderId ? store.folders.find(f => f.id === props.folderId) ?? null : null
)

function startNewFolder() {
    isNewFolder.value  = true
    editingFolder.value = { name: '' }
    showFolderModal.value = true
}

function startEditFolder(f: AcademyFolder) {
    isNewFolder.value   = false
    editingFolder.value = { ...f }
    showFolderModal.value = true
}

async function handleFolderSave() {
    if (!editingFolder.value.name?.trim()) return
    folderSubmitting.value = true
    try {
        if (isNewFolder.value) {
            await store.createFolder(editingFolder.value)
        } else {
            await store.updateFolder(editingFolder.value.id!, editingFolder.value)
        }
        showFolderModal.value = false
        editingFolder.value = {}
    } catch (e) { console.error(e) }
    finally { folderSubmitting.value = false }
}

async function handleFolderDelete(id: number) {
    if (!confirm('¿Eliminar esta carpeta? Los módulos dentro quedarán sin carpeta.')) return
    await store.deleteFolder(id)
    if (props.folderId === id) emit('folder-change', null)
}

function enterFolder(id: number) {
    emit('folder-change', id)
}

function goBack() {
    emit('folder-change', null)
}

// Sortable for folders
const initFolderSortable = () => {
    if (!folderListRef.value) return
    Sortable.create(folderListRef.value, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-40',
        onEnd: async (evt: any) => {
            const { oldIndex, newIndex } = evt
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
            const moved = store.folders[oldIndex]
            const newFolders = [...store.folders]
            newFolders.splice(oldIndex, 1)
            newFolders.splice(newIndex, 0, moved)
            const orders = newFolders.map((f, i) => ({ id: f.id, order: i + 1 }))
            await store.reorderFolders(orders)
        }
    })
}

// ─── Module-level state ─────────────────────────────────────────────────────
const showModal    = ref(false)
const editing      = ref<Partial<Module>>({})
const isNew        = ref(false)
const isSubmitting = ref(false)
const listRef      = ref<HTMLElement | null>(null)

// Modules filtered to current folder
const folderModules = computed(() => {
    if (props.folderId === null) return store.modules
    return store.modules.filter(m => m.folder_id === props.folderId)
})

function startNew() {
    isNew.value = true
    editing.value = {
        name: '',
        description: '',
        order: folderModules.value.length + 1,
        platform_ids: [],
        profile_ids: [],
        folder_id: props.folderId ?? undefined,
        visible: true,
    }
    showModal.value = true
}

function startEdit(mod: Module) {
    isNew.value = false
    const platformIds = mod.platforms?.map(p => p.id) || mod.platform_ids || []
    editing.value = { ...mod, platform_ids: platformIds, profile_ids: mod.profile_ids || [] }
    showModal.value = true
}

async function handleSave() {
    if (!editing.value.name) return
    isSubmitting.value = true
    try {
        const payload = {
            ...editing.value,
            platforms: editing.value.platform_ids,
            folder_id: editing.value.folder_id ?? props.folderId ?? null,
        }
        if (isNew.value) {
            await store.createModule(payload as any)
        } else {
            delete (payload as any).visible
            await store.updateModule(editing.value.id!, payload as any)
        }
        showModal.value = false
        editing.value = {}
    } catch (e) { console.error('Error saving module:', e) }
    finally { isSubmitting.value = false }
}

async function handleDelete(id: number) {
    if (confirm('¿Estás seguro de eliminar esta funcionalidad?')) {
        await store.deleteModule(id)
    }
}

async function togglePublish(mod: Module) {
    await store.updateModule(mod.id, { visible: !mod.visible })
}

function togglePlatform(id: number) {
    if (!editing.value.platform_ids) editing.value.platform_ids = []
    const idx = editing.value.platform_ids.indexOf(id)
    if (idx === -1) editing.value.platform_ids.push(id)
    else editing.value.platform_ids.splice(idx, 1)
}

function toggleProfile(id: number) {
    if (!editing.value.profile_ids) editing.value.profile_ids = []
    const idx = editing.value.profile_ids.indexOf(id)
    if (idx === -1) editing.value.profile_ids.push(id)
    else editing.value.profile_ids.splice(idx, 1)
}

const initSortable = () => {
    if (!listRef.value) return
    Sortable.create(listRef.value, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: async (evt: any) => {
            const { oldIndex, newIndex } = evt
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
            const movedItem = folderModules.value[oldIndex]
            const newMods   = [...folderModules.value]
            newMods.splice(oldIndex, 1)
            newMods.splice(newIndex, 0, movedItem)
            const orders = newMods.map((m, i) => ({ id: m.id, order: i + 1 }))
            await store.reorderModules(orders)
        }
    })
}

// ─── Evaluation state ──────────────────────────────────────────────────────
const showEvalModal   = ref(false)
const evalModuleId    = ref<number | null>(null)
const evalModuleName  = ref('')
const evalLoading     = ref(false)
const evalSubmitting  = ref(false)
const evalData = ref<Partial<ModuleEvaluation>>({
    title: 'Evaluación Final',
    description: '',
    practice_exercise: '',
    passing_score: 70,
    questions: [],
    visible: true,
})
const evalIsNew = ref(true)
const evalId    = ref<number | null>(null)
const maxScore  = ref<number>(100)

// ─── Weight preview ────────────────────────────────────────────────────────
const weightPreview = computed(() => {
    const questions = evalData.value.questions ?? []
    if (!questions.length) return []

    if(evalData.value.practice_exercise) {
        maxScore.value = 50
    } else {
        maxScore.value = 100
    }

    const explicit = questions.filter(q => q.weight != null && q.weight > 0)
    const assigned = explicit.reduce((s, q) => s + (q.weight ?? 0), 0)
    const remaining = Math.max(0, maxScore.value - assigned)
    const autoCount = questions.length - explicit.length
    const autoWeight = autoCount > 0 ? remaining / autoCount : 0

    return questions.map(q => ({
        id: q.id,
        weight: q.weight != null && q.weight > 0 ? q.weight : autoWeight,
        isAuto: q.weight == null || q.weight === 0,
    }))
})

const weightTotal = computed(() =>
    weightPreview.value.reduce((s, w) => s + w.weight, 0)
)

async function openEvalModal(mod: Module) {
    evalModuleId.value  = mod.id
    evalModuleName.value = mod.name
    evalLoading.value   = true
    showEvalModal.value = true

    const existing = await store.fetchModuleEvaluationAdmin(mod.id)
    if (existing) {
        evalIsNew.value = false
        evalId.value    = existing.id
        evalData.value  = {
            title: existing.title,
            description: existing.description ?? '',
            passing_score: existing.passing_score,
            practice_exercise: existing.practice_exercise,
            questions: JSON.parse(JSON.stringify(existing.questions)),
            visible: existing.visible ?? true,
        }
    } else {
        evalIsNew.value = true
        evalId.value    = null
        evalData.value  = {
            title: 'Evaluación Final',
            description: '',
            practice_exercise: '',
            passing_score: 70,
            questions: [],
            visible: true,
        }
    }
    evalLoading.value = false
}

function closeEvalModal() {
    showEvalModal.value = false
    evalModuleId.value  = null
}

function addQuestion() {
    const questions = evalData.value.questions ?? []
    questions.push({
        id: `q${Date.now()}`,
        question: '',
        type: 'single_choice',
        options: [
            { id: 'a', text: '', correct: true },
            { id: 'b', text: '', correct: false },
        ],
        expected_answer: '',
        weight: undefined,
    })
    evalData.value.questions = questions
}

function removeQuestion(qi: number) {
    evalData.value.questions?.splice(qi, 1)
}

function addOption(qi: number) {
    const opts    = evalData.value.questions![qi].options
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    opts.push({ id: letters[opts.length] || `opt${opts.length}`, text: '', correct: false })
}

function removeOption(qi: number, oi: number) {
    evalData.value.questions![qi].options.splice(oi, 1)
}

function onTypeChange(qi: number) {
    const q = evalData.value.questions![qi]
    if (q.type === 'true_false') {
        q.options = [
            { id: 'true',  text: 'Verdadero', correct: true },
            { id: 'false', text: 'Falso',     correct: false },
        ]
    } else if (q.type === 'open_answer') {
        q.options = []
        if (!q.expected_answer) q.expected_answer = ''
    } else if (q.type === 'single_choice') {
        if (!q.options?.length) {
            q.options = [
                { id: 'a', text: '', correct: true },
                { id: 'b', text: '', correct: false },
            ]
        }
        const firstCorrect = q.options.findIndex(o => o.correct)
        q.options.forEach((o, i) => { o.correct = i === (firstCorrect >= 0 ? firstCorrect : 0) })
    } else if (q.type === 'multiple_choice') {
        if (!q.options?.length) {
            q.options = [
                { id: 'a', text: '', correct: true },
                { id: 'b', text: '', correct: false },
            ]
        }
    }
}

function onSingleCorrectChange(qi: number, oi: number) {
    evalData.value.questions![qi].options.forEach((o, i) => { o.correct = i === oi })
}

async function handleEvalSave() {
    if (!evalModuleId.value) return
    const questions = evalData.value.questions ?? []
    if (questions.length === 0) { alert('Debes agregar al menos una pregunta.'); return }

    // Weight validation
    const explicitTotal = questions
        .filter(q => q.weight != null && q.weight > 0)
        .reduce((s, q) => s + (q.weight ?? 0), 0)
    if (explicitTotal > maxScore.value) {
        alert(`La suma de pesos explícitos (${explicitTotal}%) supera el ${maxScore.value}%. Ajústalos antes de guardar.`)
        return
    }

    for (const q of questions) {
        if (!q.question.trim()) { alert('Todas las preguntas deben tener texto.'); return }
        if (q.type === 'open_answer') {
            if (!q.expected_answer?.trim()) {
                alert(`La pregunta "${q.question}" debe tener una respuesta esperada.`)
                return
            }
        } else {
            const hasCorrect = q.options.some((o: EvaluationOption) => o.correct)
            if (!hasCorrect) { alert(`La pregunta "${q.question}" debe tener al menos una opción correcta.`); return }
            for (const o of q.options) {
                if (!o.text.trim()) { alert('Todas las opciones deben tener texto.'); return }
            }
        }
    }

    evalSubmitting.value = true
    try {
        const payload = { module_id: evalModuleId.value, ...evalData.value }
        if (evalIsNew.value) {
            await store.createEvaluation(payload)
        } else {
            await store.updateEvaluation(evalId.value!, payload)
        }
        closeEvalModal()
    } catch (e) { console.error('Error saving evaluation:', e) }
    finally { evalSubmitting.value = false }
}

async function handleEvalDelete() {
    if (!evalId.value) return
    if (!confirm('¿Eliminar la evaluación de este módulo? Esta acción no se puede deshacer.')) return
    evalSubmitting.value = true
    try {
        await store.deleteEvaluation(evalId.value)
        closeEvalModal()
    } finally { evalSubmitting.value = false }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
    await store.fetchFolders()
    nextTick(() => {
        initFolderSortable()
        initSortable()
    })
})

// Reinit sortable when folder changes (different list)
watch(() => props.folderId, () => {
    nextTick(() => initSortable())
})
</script>

<template>
<div>

    <!-- ═══ FOLDER LIST view (no folder selected) ═══════════════════════════ -->
    <template v-if="folderId === null">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-foreground">Funcionalidades</h2>
                <p class="text-sm text-muted-foreground">Organiza los módulos por carpetas.</p>
            </div>
            <button @click="startNewFolder"
                class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <FolderPlus class="w-4 h-4" />
                Nueva Carpeta
            </button>
        </div>

        <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-2" />
            <p>Cargando carpetas...</p>
        </div>

        <div v-else ref="folderListRef" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="folder in store.folders" :key="folder.id"
                class="group relative flex flex-col bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                @click="enterFolder(folder.id)">

                <!-- Drag handle -->
                <div class="drag-handle absolute top-3 right-3 opacity-0 group-hover:opacity-40 cursor-grab" @click.stop>
                    <GripVertical class="w-4 h-4 text-muted-foreground" />
                </div>

                <div class="flex items-start gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                        <Folder class="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-foreground truncate">{{ folder.name }}</h3>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {{ folder.modules_count ?? store.modules.filter(m => m.folder_id === folder.id).length }}
                            módulos
                        </p>
                    </div>
                </div>

                <div class="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                    <button @click.stop="enterFolder(folder.id)"
                        class="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                        Ver módulos <ChevronRight class="w-3.5 h-3.5" />
                    </button>
                    <div class="flex gap-1">
                        <button @click.stop="startEditFolder(folder)"
                            class="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                            <Edit class="w-3.5 h-3.5" />
                        </button>
                        <button @click.stop="handleFolderDelete(folder.id)"
                            class="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                            <Trash2 class="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="store.folders.length === 0"
                class="col-span-full text-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                <Folder class="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p class="text-muted-foreground font-medium">No hay carpetas aún.</p>
                <p class="text-xs text-muted-foreground/70 mt-1">Crea una carpeta para organizar tus módulos.</p>
            </div>
        </div>
    </template>

    <!-- ═══ MODULE LIST view (inside a folder) ══════════════════════════════ -->
    <template v-else>

        <!-- Breadcrumb + actions -->
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
                <button @click="goBack"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ArrowLeft class="w-4 h-4" />
                    Funcionalidades
                </button>
                <ChevronRight class="w-4 h-4 text-muted-foreground/40" />
                <div class="flex items-center gap-2">
                    <FolderOpen class="w-4 h-4 text-primary" />
                    <h2 class="text-lg font-bold text-foreground">{{ currentFolder?.name }}</h2>
                </div>
            </div>
            <button @click="startNew"
                class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Plus class="w-4 h-4" />
                Nueva Funcionalidad
            </button>
        </div>

        <!-- Loading -->
        <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-2" />
            <p>Cargando módulos...</p>
        </div>

        <!-- Module list -->
        <div v-else class="grid gap-3" ref="listRef">
            <div v-for="mod in folderModules" :key="mod.id"
                class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-[1.01] border border-border/50">
                <div class="hidden md:block cursor-grab opacity-40 hover:opacity-100 transition-opacity drag-handle p-1">
                    <GripVertical class="w-4 h-4 text-muted-foreground" />
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                        <h3 class="font-bold text-sm text-foreground">{{ mod.name }}</h3>
                        <div class="flex gap-1">
                            <span v-for="plat in mod.platforms" :key="plat.id"
                                class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter"
                                :style="`background-color: ${plat.color}20; color: ${plat.color}; border: 1px solid ${plat.color}40`">
                                {{ plat.name }}
                            </span>
                        </div>
                    </div>
                    <p class="text-xs text-muted-foreground w-4xl truncate">{{ mod.description || 'Sin descripción' }}</p>
                    <!-- Profile badges -->
                    <div v-if="mod.profile_ids?.length" class="flex flex-wrap gap-1 mt-1.5">
                        <span v-for="pid in mod.profile_ids" :key="pid"
                            class="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/20">
                            {{ ACADEMY_PROFILES.find(p => p.id === pid)?.name ?? pid }}
                        </span>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-1">
                    <button @click="openEvalModal(mod)"
                        class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        title="Gestionar evaluación del módulo">
                        <ClipboardList class="w-4 h-4" />
                    </button>
                    <button @click="togglePublish(mod)" class="p-2 rounded-lg transition-all"
                        :class="mod.visible ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
                        :title="mod.visible ? 'Visible' : 'Oculto'">
                        <Eye v-if="mod.visible" class="w-4 h-4" />
                        <EyeOff v-else class="w-4 h-4" />
                    </button>
                    <button @click="startEdit(mod)"
                        class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        <Edit class="w-4 h-4" />
                    </button>
                    <button @click="handleDelete(mod.id)"
                        class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div v-if="folderModules.length === 0"
                class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                <p class="text-muted-foreground">No hay funcionalidades en esta carpeta.</p>
                <button @click="startNew" class="mt-3 text-sm text-primary hover:underline font-semibold">
                    + Agregar la primera
                </button>
            </div>
        </div>
    </template>

    <!-- ═══ Folder Create/Edit Modal ════════════════════════════════════════ -->
    <Modal :show="showFolderModal" :title="isNewFolder ? 'Nueva Carpeta' : 'Editar Carpeta'" @close="showFolderModal = false">
        <div class="space-y-4">
            <div>
                <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre de la Carpeta</label>
                <input v-model="editingFolder.name" placeholder="Ej: Módulos de Ventas"
                    class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none" />
            </div>
        </div>
        <template #footer>
            <button @click="showFolderModal = false"
                class="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
            </button>
            <button @click="handleFolderSave" :disabled="folderSubmitting"
                class="px-8 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100">
                <Loader2 v-if="folderSubmitting" class="w-4 h-4 animate-spin" />
                {{ folderSubmitting ? 'Guardando...' : (isNewFolder ? 'Crear Carpeta' : 'Guardar Cambios') }}
            </button>
        </template>
    </Modal>

    <!-- ═══ Module Create/Edit Modal ════════════════════════════════════════ -->
    <Modal :show="showModal" :title="isNew ? 'Nueva Funcionalidad' : 'Editar Funcionalidad'" @close="showModal = false">
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre</label>
                    <input v-model="editing.name" placeholder="Ej: Fundamentos de Seguridad"
                        class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-shadow outline-none" />
                </div>

                <div class="md:col-span-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Plataformas Asociadas</label>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="plat in store.platforms" :key="plat.id" @click="togglePlatform(plat.id)"
                            type="button" class="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                            :class="editing.platform_ids?.includes(plat.id)
                                ? 'gradient-bg text-primary-foreground border-transparent shadow-md shadow-primary/20'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'">
                            {{ plat.name }}
                        </button>
                    </div>
                </div>

                <div class="md:col-span-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Users class="w-3.5 h-3.5" /> Perfiles Asociados
                    </label>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="prof in ACADEMY_PROFILES" :key="prof.id" @click="toggleProfile(prof.id)"
                            type="button" class="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                            :class="editing.profile_ids?.includes(prof.id)
                                ? 'bg-violet-500 text-white border-transparent shadow-md'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'">
                            {{ prof.name }}
                        </button>
                    </div>
                </div>

                <div class="md:col-span-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción</label>
                    <textarea v-model="editing.description" rows="3" placeholder="Breve descripción de la funcionalidad..."
                        class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
            </div>
        </div>

        <template #footer>
            <button @click="showModal = false"
                class="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
            </button>
            <button @click="handleSave" :disabled="isSubmitting"
                class="px-8 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100">
                <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Funcionalidad' : 'Guardar Cambios') }}
            </button>
        </template>
    </Modal>

    <!-- ═══ Evaluation Builder Modal ════════════════════════════════════════ -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="showEvalModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeEvalModal" />

                <form @submit.prevent="handleEvalSave" class="relative z-10 w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <!-- Header -->
                        <div class="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                            <div>
                                <h2 class="text-base font-bold text-foreground">Evaluación del Módulo</h2>
                                <p class="text-xs text-muted-foreground">{{ evalModuleName }}</p>
                            </div>
                            <button @click="closeEvalModal" class="p-2 rounded-lg hover:bg-muted transition-colors">
                                <X class="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        <!-- Body -->
                        <div class="overflow-y-auto flex-1 p-6 space-y-5">
                            <div v-if="evalLoading" class="flex items-center justify-center py-12">
                                <Loader2 class="w-6 h-6 animate-spin text-primary" />
                            </div>

                            <template v-else>
                                <!-- General settings -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div class="md:col-span-2">
                                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Título</label>
                                        <input v-model="evalData.title"
                                            class="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                    <div>
                                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Puntaje mínimo (%)</label>
                                        <input type="number" v-model.number="evalData.passing_score" min="0" max="100"
                                            class="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Objetivo (opcional)</label>
                                        <textarea v-model="evalData.description" rows="2" placeholder="Objetivo de la evaluación..."
                                            class="field-sizing-content min-h-[40px] w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Ejercicio práctico (opcional)</label>
                                        <textarea v-model="evalData.practice_exercise" rows="2" placeholder="Instrucciones del ejercicio..."
                                            class="field-sizing-content min-h-[40px] w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                </div>

                                <!-- Weight distribution preview -->
                                <div v-if="(evalData.questions ?? []).length > 0"
                                    class="flex flex-wrap items-center gap-2 p-3 rounded-xl border"
                                    :class="Math.abs(weightTotal - maxScore) > 0.5 ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'">
                                    <span class="text-[10px] font-bold uppercase tracking-wider"
                                        :class="Math.abs(weightTotal - maxScore) > 0.5 ? 'text-destructive' : 'text-success'">
                                        Distribución de pesos:
                                    </span>
                                    <span v-for="(w, wi) in weightPreview" :key="w.id"
                                        class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                        :class="w.isAuto
                                            ? 'bg-muted text-muted-foreground'
                                            : 'bg-primary/10 text-primary border border-primary/20'">
                                        P{{ wi + 1 }}: {{ w.weight.toFixed(1) }}%{{ w.isAuto ? ' (auto)' : '' }}
                                    </span>
                                    <span class="ml-auto text-[10px] font-bold"
                                        :class="Math.abs(weightTotal - maxScore) > 0.5 ? 'text-destructive' : 'text-success'">
                                        Total: {{ weightTotal.toFixed(1) }}%
                                    </span>
                                </div>

                                <!-- Questions -->
                                <div>
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preguntas</label>
                                        <button @click="addQuestion" type="button"
                                            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-primary-foreground text-xs font-bold hover:scale-105 transition-transform">
                                            <PlusCircle class="w-3.5 h-3.5" /> Agregar pregunta
                                        </button>
                                    </div>

                                    <div v-if="(evalData.questions ?? []).length === 0"
                                        class="text-center py-8 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                                        <ClipboardList class="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                        <p class="text-sm text-muted-foreground">Sin preguntas. La evaluación es opcional.</p>
                                    </div>

                                    <div class="space-y-4">
                                        <div v-for="(q, qi) in (evalData.questions ?? [])" :key="q.id"
                                            class="bg-muted/20 border border-border/50 rounded-2xl p-4">

                                            <!-- Question header -->
                                            <div class="flex items-start gap-3 mb-3">
                                                <!-- Question number + weight input -->
                                                <div class="shrink-0 flex flex-col items-center gap-1">
                                                    <span class="w-7 h-7 rounded-full gradient-bg text-primary-foreground text-xs font-bold flex items-center justify-center">
                                                        {{ qi + 1 }}
                                                    </span>
                                                    <div class="flex items-center gap-0.5" title="Peso de calificación (deja vacío para distribución automática)">
                                                        <input
                                                            type="number"
                                                            :value="q.weight ?? ''"
                                                            @input="q.weight = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined"
                                                            placeholder="—"
                                                            min="0" max="100" step="1"
                                                            class="w-10 text-center text-[10px] px-1 py-1 rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-primary/30"
                                                        />
                                                        <span class="text-[9px] text-muted-foreground">%</span>
                                                    </div>
                                                </div>

                                                <div class="flex-1 space-y-2">
                                                    <input v-model="q.question" placeholder="Escribe la pregunta..."
                                                        class="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                                    <select v-model="q.type" @change="onTypeChange(qi)"
                                                        class="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20">
                                                        <option value="single_choice">Opción única</option>
                                                        <option value="multiple_choice">Opción múltiple</option>
                                                        <option value="true_false">Verdadero / Falso</option>
                                                        <option value="open_answer">Respuesta Abierta</option>
                                                    </select>
                                                </div>
                                                <button @click="removeQuestion(qi)" type="button"
                                                    class="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                                                    <Trash2 class="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>

                                            <!-- Open answer field -->
                                            <div v-if="q.type === 'open_answer'" class="ml-10 space-y-2">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <BrainCircuit class="w-3.5 h-3.5 text-violet-500" />
                                                    <span class="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Respuesta esperada (referencia para comparación)</span>
                                                </div>
                                                <textarea v-model="q.expected_answer" rows="3"
                                                    placeholder="Describe la respuesta correcta..."
                                                    class="w-full px-3 py-2 text-[12px] mb-0 rounded-xl border border-violet-400/40 bg-violet-500/5 resize-none outline-none focus:ring-2 focus:ring-violet-400/30" />
                                                <p class="text-[10px] text-muted-foreground/70">Se realizará una comparación semántica de la respuesta del usuario con este texto.</p>
                                            </div>

                                            <!-- Choice options -->
                                            <div v-else class="space-y-2 ml-10">
                                                <div v-for="(opt, oi) in q.options" :key="opt.id" class="flex items-center gap-2">
                                                    <template v-if="q.type === 'single_choice' || q.type === 'true_false'">
                                                        <input type="radio" :name="`q-${qi}`" :checked="opt.correct"
                                                            @change="onSingleCorrectChange(qi, oi)"
                                                            class="appearance-none w-3.5 h-3.5 border-2 border-gray-400 rounded-full bg-transparent checked:bg-blue-500 checked:border-blue-500 focus:outline-none transition-all" />
                                                    </template>
                                                    <template v-else>
                                                        <input type="checkbox" v-model="opt.correct"
                                                            class="appearance-none w-3.5 h-3.5 border-2 border-gray-400 rounded-md bg-transparent checked:bg-blue-500 checked:border-blue-500 focus:outline-none transition-all" />
                                                    </template>

                                                    <input v-model="opt.text" :placeholder="`Opción ${oi + 1}`"
                                                        :disabled="q.type === 'true_false'"
                                                        class="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />

                                                    <button v-if="q.type !== 'true_false' && q.options.length > 2"
                                                        @click="removeOption(qi, oi)" type="button"
                                                        class="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                                        <X class="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button v-if="q.type !== 'true_false'" @click="addOption(qi)" type="button"
                                                    class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-colors">
                                                    <PlusCircle class="w-3 h-3" /> Agregar opción
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Visible toggle -->
                                <div class="flex items-center gap-3">
                                    <button type="button" @click="evalData.visible = !evalData.visible"
                                        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                                        :class="evalData.visible
                                            ? 'bg-success/10 text-success border-success/20'
                                            : 'bg-muted text-muted-foreground border-border'">
                                        <CheckSquare class="w-4 h-4" />
                                        {{ evalData.visible ? 'Evaluación activa' : 'Evaluación inactiva' }}
                                    </button>
                                    <span class="text-xs text-muted-foreground">Si está inactiva no se mostrará al finalizar el módulo.</span>
                                </div>
                            </template>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10 shrink-0">
                            <button type="button" v-if="!evalIsNew && evalId" @click="handleEvalDelete" :disabled="evalSubmitting"
                                class="px-4 py-2 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                                Eliminar evaluación
                            </button>
                            <div v-else />
                            <div class="flex gap-3">
                                <button type="button" @click="closeEvalModal"
                                    class="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" :disabled="evalSubmitting || evalLoading"
                                    class="px-6 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100">
                                    <Loader2 v-if="evalSubmitting" class="w-4 h-4 animate-spin" />
                                    {{ evalSubmitting ? 'Guardando...' : (evalIsNew ? 'Crear Evaluación' : 'Guardar Cambios') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Transition>
    </Teleport>
</div>
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
