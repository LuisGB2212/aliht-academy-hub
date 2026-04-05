<script setup lang="ts">
import { onMounted, nextTick, ref } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import { useLessonForm } from '@/composables/useLessonForm'
import type { ContentType } from '@/types/academy-type'
import {
    Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2,
    Video, FileText, Link, Type, Globe, Monitor, ImageIcon,
    UploadCloud, CheckCircle2, AlertCircle, X
} from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import Sortable from 'sortablejs'

const store = useLmsStore()
const listRef = ref<HTMLElement | null>(null)

const {
    showModal,
    editing,
    isNew,
    isSubmitting,
    uploadStates,
    availablePlatforms,
    startNew,
    startEdit,
    handleSave,
    handleDelete,
    togglePublish,
    setModule,
    addPlatformContent,
    removePlatformContent,
    handleFileUpload,
    getPlatformName,
    isUploadableType,
    getFileAccept,
} = useLessonForm()

// ─── Content type metadata ──────────────────────────────────────────────────
const contentTypes: { value: ContentType; label: string; icon: any; hint: string }[] = [
    { value: 'video', label: 'Video', icon: Video, hint: 'Sube un archivo de video (.mp4, .mov, .webm)' },
    { value: 'pdf', label: 'PDF', icon: FileText, hint: 'Sube un documento PDF' },
    { value: 'link', label: 'Enlace', icon: Link, hint: 'Ingresa la URL del recurso externo' },
    { value: 'text', label: 'Texto/Lectura', icon: Type, hint: 'Escribe el contenido directamente' },
]

const getContentTypeIcon = (type: string) =>
    contentTypes.find(t => t.value === type)?.icon ?? Type

const getContentTypeHint = (type: ContentType) =>
    contentTypes.find(t => t.value === type)?.hint ?? ''

// ─── File input handler ─────────────────────────────────────────────────────
function onFileChange(event: Event, index: number, type: ContentType) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    handleFileUpload(index, file, type)
    // Reset so the same file can be re-selected if needed
    input.value = ''
}

// ─── Drag-to-reorder ────────────────────────────────────────────────────────
const initSortable = () => {
    if (!listRef.value) return
    Sortable.create(listRef.value, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: async (evt: any) => {
            const { oldIndex, newIndex } = evt
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

            const movedItem = store.lessons[oldIndex]
            const newLessons = [...store.lessons]
            newLessons.splice(oldIndex, 1)
            newLessons.splice(newIndex, 0, movedItem)

            await store.reorderLessons(
                newLessons.map((l, i) => ({ id: l.id, order: i + 1 }))
            )
        },
    })
}

onMounted(async () => {
    nextTick(initSortable)
})
</script>

<template>
    <div>
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-foreground">Tutoriales (Guías)</h2>
                <p class="text-sm text-muted-foreground text-pretty">Guías paso a paso para el uso de las
                    funcionalidades.</p>
            </div>
            <button @click="startNew"
                class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Plus class="w-4 h-4" />
                Nuevo Tutorial
            </button>
        </div>

        <!-- Loading -->
        <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-2" />
            <p>Cargando tutoriales...</p>
        </div>

        <!-- List -->
        <div v-else class="grid gap-3" ref="listRef">
            <div v-for="lesson in store.lessons" :key="lesson.id"
                class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-[1.01] hover:cursor-pointer">
                <div
                    class="hidden md:block cursor-grab opacity-40 hover:opacity-100 transition-opacity drag-handle p-1">
                    <GripVertical class="w-4 h-4 text-muted-foreground" />
                </div>

                <div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <component :is="getContentTypeIcon(lesson.type_content)" class="w-5 h-5 text-muted-foreground" />
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h3 class="font-bold text-sm text-foreground">{{ lesson.title }}</h3>
                        <div class="flex gap-1 flex-wrap">
                            <span v-for="mod in lesson.modules" :key="mod.id"
                                class="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase">
                                {{ mod.name }}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1">
                            <Monitor class="w-3 h-3" />
                            {{ lesson.platform_contents?.length || 0 }} Variantes
                        </span>
                        <p class="truncate max-w-2xl">{{ lesson.description || 'Sin descripción' }}</p>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-1">
                    <button @click="togglePublish(lesson)" class="p-2 rounded-lg transition-all"
                        :class="lesson.visible ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
                        :title="lesson.visible ? 'Visible' : 'Oculto'">
                        <Eye v-if="lesson.visible" class="w-4 h-4" />
                        <EyeOff v-else class="w-4 h-4" />
                    </button>
                    <button @click="startEdit(lesson)"
                        class="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        <Edit class="w-4 h-4" />
                    </button>
                    <button @click="handleDelete(lesson.id)"
                        class="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div v-if="store.lessons.length === 0"
                class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                <p class="text-muted-foreground">No hay tutoriales registrados.</p>
            </div>
        </div>

        <!-- ─── Create / Edit Modal ─────────────────────────────────────────────── -->
        <Modal :show="showModal" :title="isNew ? 'Nuevo Tutorial' : 'Editar Tutorial'" @close="showModal = false">
            <div class="space-y-8 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin">

                <!-- Basic Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label
                            class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Título
                            del Tutorial</label>
                        <input v-model="editing.title"
                            class="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>

                    <div class="md:col-span-2">
                        <label
                            class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción</label>
                        <textarea v-model="editing.description" rows="2"
                            class="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>

                    <div class="md:col-span-2">
                        <label
                            class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Funcionalidades
                            (Módulo)</label>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="mod in store.modules" :key="mod.id" @click="setModule(mod.id)" type="button"
                                class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border" :class="editing.module_ids?.includes(mod.id)
                                    ? 'bg-primary text-primary-foreground border-transparent'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted font-medium'">
                                {{ mod.name }}
                            </button>
                        </div>
                        <p v-if="!editing.module_ids?.length" class="text-[10px] text-destructive mt-1">
                            Debes seleccionar una funcionalidad para habilitar el contenido por plataforma.
                        </p>
                    </div>
                </div>

                <!-- Platform Specific Content -->
                <div class="space-y-4 pt-4 border-t border-border/50">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-bold flex items-center gap-2">
                            <Globe class="w-4 h-4 text-primary" />
                            Contenido Personalizado por Plataforma
                        </h4>
                        <div class="flex gap-1.5">
                            <button v-for="plat in availablePlatforms" :key="plat.id"
                                @click="addPlatformContent(plat.id)"
                                class="text-[10px] px-2.5 py-1.5 rounded-lg font-bold border transition-all"
                                :style="`border-color: ${plat.color}40; color: ${plat.color}; background-color: ${plat.color}10`"
                                :class="editing.platform_contents?.some(c => c.platform_id === plat.id)
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:scale-105 active:scale-95'">
                                + {{ plat.name }}
                            </button>
                        </div>
                    </div>

                    <!-- Empty state -->
                    <div v-if="!editing.platform_contents?.length"
                        class="text-center py-10 bg-muted/10 rounded-2xl border-2 border-dashed border-border/50">
                        <ImageIcon class="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p class="text-xs text-muted-foreground font-medium">
                            Añade contenido específico para cada plataforma para que sea visible.
                        </p>
                    </div>

                    <!-- Platform content blocks -->
                    <div v-for="(pc, index) in editing.platform_contents" :key="pc.platform_id"
                        class="p-5 rounded-2xl border border-border bg-background shadow-sm space-y-4 relative group">

                        <!-- Block header -->
                        <div class="flex items-center justify-between pb-3 border-b border-border/50">
                            <span class="text-xs font-bold uppercase flex items-center gap-2">
                                <div class="w-2.5 h-2.5 rounded-full"
                                    :style="`background-color: ${store.platforms.find(p => p.id === pc.platform_id)?.color || 'var(--color-primary)'}`" />
                                {{ getPlatformName(pc.platform_id) }}
                            </span>
                            <button @click="removePlatformContent(index)"
                                class="text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded-lg transition-all">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>

                        <!-- Fields grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- Optional title -->
                            <div class="md:col-span-2">
                                <label
                                    class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">
                                    Título Específico (Opcional)
                                </label>
                                <input v-model="pc.title"
                                    :placeholder="`Ej: ${editing.title} para ${getPlatformName(pc.platform_id)}`"
                                    class="w-full px-4 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" />
                            </div>

                            <!-- Content type selector -->
                            <div>
                                <label
                                    class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">
                                    Tipo de Recurso
                                </label>
                                <select v-model="pc.type"
                                    class="w-full px-3 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none cursor-pointer">
                                    <option v-for="type in contentTypes" :key="type.value" :value="type.value">
                                        {{ type.label }}
                                    </option>
                                </select>
                            </div>

                            <!-- ─ Content input — changes by type ─ -->
                            <div class="md:col-span-3">
                                <label
                                    class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">
                                    {{ pc.type === 'link' ? 'URL del Enlace' : pc.type === 'text' ? 'Contenido de Texto' : 'Archivo' }}
                                </label>

                                <!-- LINK → plain URL input (required) -->
                                <template v-if="pc.type === 'link'">
                                    <input v-model="pc.content.value" type="url" required
                                        placeholder="https://ejemplo.com/recurso"
                                        class="w-full px-4 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner font-mono" />
                                </template>

                                <!-- TEXT → textarea (required) -->
                                <template v-else-if="pc.type === 'text'">
                                    <textarea v-model="pc.content.value" required rows="4"
                                        placeholder="Escribe aquí el contenido textual de la lección..."
                                        class="w-full px-4 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner resize-none" />
                                </template>

                                <!-- VIDEO / PDF → S3 file upload -->
                                <template v-else>
                                    <!-- Upload zone -->
                                    <div class="relative">
                                        <!-- Show existing file URL as readonly preview -->
                                        <div v-if="pc.content.value && !uploadStates[index]?.isUploading"
                                            class="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-success/30 bg-success/5 text-xs text-success font-mono mb-2">
                                            <CheckCircle2 class="w-4 h-4 shrink-0" />
                                            <span class="truncate flex-1">{{ pc.content.value }}</span>
                                            <button type="button" @click="pc.content.value = ''"
                                                class="shrink-0 hover:text-destructive transition-colors">
                                                <X class="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <!-- Upload button + progress -->
                                        <label
                                            class="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group/upload"
                                            :class="uploadStates[index]?.isUploading ? 'pointer-events-none' : ''">
                                            <input type="file" class="hidden" :accept="getFileAccept(pc.type)"
                                                @change="(e) => onFileChange(e, index, pc.type)" />

                                            <!-- Uploading state -->
                                            <template v-if="uploadStates[index]?.isUploading">
                                                <Loader2 class="w-4 h-4 text-primary animate-spin shrink-0" />
                                                <div class="flex-1">
                                                    <div
                                                        class="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                        <span>Subiendo archivo...</span>
                                                        <span class="font-bold text-primary">{{
                                                            uploadStates[index].progress }}%</span>
                                                    </div>
                                                    <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div class="h-full bg-primary rounded-full transition-all duration-300"
                                                            :style="`width: ${uploadStates[index].progress}%`" />
                                                    </div>
                                                </div>
                                            </template>

                                            <!-- Idle state -->
                                            <template v-else>
                                                <UploadCloud
                                                    class="w-4 h-4 text-muted-foreground group-hover/upload:text-primary transition-colors shrink-0" />
                                                <span
                                                    class="text-xs text-muted-foreground group-hover/upload:text-primary transition-colors">
                                                    {{ pc.content.value ? 'Reemplazar archivo' : `Seleccionar ${pc.type === 'video' ? 'video' : 'PDF'}` }}
                                                </span>
                                                <span class="ml-auto text-[10px] text-muted-foreground/60">
                                                    {{ pc.type === 'video' ? 'MP4, MOV, WEBM • máx. 500 MB' : 'PDF •máx. 50 MB' }}
                                                </span>
                                            </template>
                                        </label>

                                        <!-- Upload error -->
                                        <p v-if="uploadStates[index]?.error"
                                            class="flex items-center gap-1.5 text-[10px] text-destructive mt-1.5 font-medium">
                                            <AlertCircle class="w-3 h-3" />
                                            {{ uploadStates[index].error }}
                                        </p>
                                    </div>
                                </template>
                            </div>
                        </div>
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
                    {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Tutorial' : 'Guardar Cambios') }}
                </button>
            </template>
        </Modal>
    </div>
</template>
