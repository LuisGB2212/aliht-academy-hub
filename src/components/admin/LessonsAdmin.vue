<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Lesson, LessonPlatformContent, Platform } from '@/types/academy-type'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2, Video, FileText, Link, Type, Globe, Monitor, ImageIcon } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import Sortable from 'sortablejs'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Lesson>>({})
const isNew = ref(false)
const isSubmitting = ref(false)
const listRef = ref<HTMLElement | null>(null)

const contentTypes = [
    { value: 'video', label: 'Video', icon: Video },
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'link', label: 'Enlace', icon: Link },
    { value: 'text', label: 'Texto/Lectura', icon: Type },
]

function startNew() {
    isNew.value = true
    editing.value = {
        title: '',
        description: '',
        type_content: 'video',
        order: store.lessons.length + 1,
        visible: true,
        module_ids: [],
        platform_contents: []
    }
    showModal.value = true
}

function startEdit(lesson: Lesson) {
    isNew.value = false
    const moduleIds = lesson.modules?.map(m => m.id) || lesson.module_ids || []
    
    // Map platform contents, ensuring content is an object with a value key
    const platformContents = (lesson.platform_contents || []).map(pc => {
        let contentObj = { value: '' }
        if (typeof pc.content === 'object' && pc.content !== null) {
            contentObj = { ...pc.content }
        } else if (typeof pc.content === 'string') {
            contentObj = { value: pc.content }
        }
        return {
            ...pc,
            content: contentObj
        }
    })

    editing.value = {
        ...lesson,
        module_ids: moduleIds,
        platform_contents: platformContents
    }
    showModal.value = true
}

async function handleSave() {
    if (!editing.value.title) return

    isSubmitting.value = true
    try {
        const payload = {
            ...editing.value,
            modules: editing.value.module_ids,
            // Map content back to JSON structure if needed or just send the object
            platform_contents: editing.value.platform_contents?.map(pc => ({
                ...pc,
                content: pc.content // should already be an object
            }))
        }

        if (isNew.value) {
            await store.createLesson(payload)
        } else {
            await store.updateLesson(editing.value.id!, payload)
        }
        showModal.value = false
        editing.value = {}
    } catch (error) {
        console.error('Error saving lesson:', error)
    } finally {
        isSubmitting.value = false
    }
}

async function handleDelete(id: number) {
    if (confirm('¿Estás seguro de eliminar este tutorial?')) {
        await store.deleteLesson(id)
    }
}

async function togglePublish(lesson: Lesson) {
    await store.updateLesson(lesson.id, { visible: !lesson.visible })
}

function setModule(id: number) {
    editing.value.module_ids = [id]
    
    // Optional: Clean up platform contents that are no longer valid for this module
    if (editing.value.platform_contents) {
        const validPlatformIds = availablePlatforms.value.map((p: any) => p.id)
        editing.value.platform_contents = editing.value.platform_contents.filter(pc => 
            validPlatformIds.includes(pc.platform_id)
        )
    }
}

function addPlatformContent(platformId: number) {
    if (!editing.value.platform_contents) editing.value.platform_contents = []
    if (editing.value.platform_contents.some(c => c.platform_id === platformId)) return

    editing.value.platform_contents.push({
        platform_id: platformId,
        type: 'video',
        title: '',
        content: { value: '' }, // Start with a JSON structure
        order: 0,
        visible: true
    })
}

function removePlatformContent(index: number) {
    editing.value.platform_contents?.splice(index, 1)
}

const availablePlatforms = computed(() => {
    if (!editing.value.module_ids || editing.value.module_ids.length === 0) return []
    const modId = editing.value.module_ids[0]
    const mod = store.modules.find(m => m.id === modId)
    return mod?.platforms || []
})

const getContentTypeIcon = (type: string) => contentTypes.find(t => t.value === type)?.icon || Type
const getPlatformName = (id: number) => store.platforms.find(p => p.id === id)?.name || '?'

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

            const orders = newLessons.map((l, index) => ({
                id: l.id,
                order: index + 1
            }))

            await store.reorderLessons(orders)
        }
    })
}

onMounted(async () => {
    await store.fetchLessons()
    await store.fetchModules()
    await store.fetchPlatforms()
    nextTick(() => {
        initSortable()
    })
})
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-foreground">Tutoriales (Guías)</h2>
                <p class="text-sm text-muted-foreground text-pretty">Guías paso a paso para el uso de las funcionalidades.</p>
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
                class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-105 hover:cursor-pointer">
                <div class="hidden md:block cursor-grab opacity-40 hover:opacity-100 transition-opacity drag-handle p-1">
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
                        <p class="truncate">{{ lesson.description || 'Sin descripción' }}</p>
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

        <!-- Create/Edit Modal -->
        <Modal :show="showModal" :title="isNew ? 'Nuevo Tutorial' : 'Editar Tutorial'" @close="showModal = false">
            <div class="space-y-8 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin">
                <!-- Basic Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Título del Tutorial</label>
                        <input v-model="editing.title" class="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>

                    <div class="md:col-span-2">
                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descripción</label>
                        <textarea v-model="editing.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>

                    <div class="md:col-span-2">
                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Funcionalidades (Módulo)</label>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="mod in store.modules" :key="mod.id" @click="setModule(mod.id)"
                                type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                                :class="editing.module_ids?.includes(mod.id)
                                    ? 'bg-primary text-primary-foreground border-transparent'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted font-medium'">
                                {{ mod.name }}
                            </button>
                        </div>
                        <p v-if="!editing.module_ids?.length" class="text-[10px] text-destructive mt-1">Debes seleccionar una funcionalidad para habilitar el contenido por plataforma.</p>
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
                            <button v-for="plat in availablePlatforms" :key="plat.id" @click="addPlatformContent(plat.id)"
                                class="text-[10px] px-2.5 py-1.5 rounded-lg font-bold border transition-all"
                                :style="`border-color: ${plat.color}40; color: ${plat.color}; background-color: ${plat.color}10`"
                                :class="editing.platform_contents?.some(c => c.platform_id === plat.id) ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'"
                            >
                                + {{ plat.name }}
                            </button>
                        </div>
                    </div>

                    <div v-if="editing.platform_contents?.length === 0"
                        class="text-center py-10 bg-muted/10 rounded-2xl border-2 border-dashed border-border/50">
                        <ImageIcon class="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p class="text-xs text-muted-foreground font-medium">Añade contenido específico para cada plataforma para que sea visible.</p>
                    </div>

                    <div v-for="(pc, index) in editing.platform_contents" :key="pc.platform_id"
                        class="p-5 rounded-2xl border border-border bg-background shadow-sm space-y-4 relative group">
                        <div class="flex items-center justify-between pb-3 border-b border-border/50">
                            <span class="text-xs font-bold uppercase flex items-center gap-2">
                                <div class="w-2.5 h-2.5 rounded-full" :style="`background-color: ${store.platforms.find(p => p.id === pc.platform_id)?.color || 'var(--color-primary)'}`" />
                                {{ getPlatformName(pc.platform_id) }}
                            </span>
                            <button @click="removePlatformContent(index)"
                                class="text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded-lg transition-all">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="md:col-span-2">
                                <label class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">Título Específico (Opcional)</label>
                                <input v-model="pc.title" placeholder="Ej: {{ editing.title }} para {{ getPlatformName(pc.platform_id) }}"
                                    class="w-full px-4 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" />
                            </div>
                            <div>
                                <label class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">Tipo de Recurso</label>
                                <select v-model="pc.type"
                                    class="w-full px-3 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none cursor-pointer">
                                    <option v-for="type in contentTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
                                </select>
                            </div>
                            <div class="md:col-span-3">
                                <label class="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5 tracking-wider">Contenido / URL de Recurso</label>
                                <input v-model="pc.content.value" placeholder="Pega aquí la URL del video, PDF o el enlace..."
                                    class="w-full px-4 py-2 rounded-xl border border-input bg-muted/30 focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner font-mono" />
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
