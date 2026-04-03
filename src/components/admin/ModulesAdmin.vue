<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Module } from '@/types/academy-type'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2 } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import Sortable from 'sortablejs'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Module>>({})
const isNew = ref(false)
const isSubmitting = ref(false)
const listRef = ref<HTMLElement | null>(null)

function startNew() {
    isNew.value = true
    editing.value = {
        name: '',
        description: '',
        order: store.modules.length + 1,
        platform_ids: [],
        visible: true,
    }
    showModal.value = true
}

function startEdit(mod: Module) {
    isNew.value = false
    const platformIds = mod.platforms?.map(p => p.id) || mod.platform_ids || []
    editing.value = { ...mod, platform_ids: platformIds }
    showModal.value = true
}

async function handleSave() {
    if (!editing.value.name) return

    isSubmitting.value = true
    try {
        const payload = {
            ...editing.value,
            platforms: editing.value.platform_ids
        }

        if (isNew.value) {
            await store.createModule(payload as any)
        } else {
            await store.updateModule(editing.value.id!, payload as any)
        }
        showModal.value = false
        editing.value = {}
    } catch (error) {
        console.error('Error saving module:', error)
    } finally {
        isSubmitting.value = false
    }
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
    if (idx === -1) {
        editing.value.platform_ids.push(id)
    } else {
        editing.value.platform_ids.splice(idx, 1)
    }
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

            const movedItem = store.modules[oldIndex]
            const newModules = [...store.modules]
            newModules.splice(oldIndex, 1)
            newModules.splice(newIndex, 0, movedItem)

            // Update orders
            const orders = newModules.map((m, index) => ({
                id: m.id,
                order: index + 1
            }))

            await store.reorderModules(orders)
        }
    })
}

onMounted(async () => {
    nextTick(() => {
        initSortable()
    })
})
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-foreground">Módulos (Funcionalidades)</h2>
                <p class="text-sm text-muted-foreground text-pretty">Gestiona las funcionalidades que pueden compartirse entre múltiples plataformas.</p>
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
            <p>Cargando funcionalidades...</p>
        </div>

        <!-- List -->
        <div v-else class="grid gap-3" ref="listRef">
            <div v-for="mod in store.modules" :key="mod.id"
                class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-105 hover:cursor-pointer">
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
                    <p class="text-xs text-muted-foreground truncate">{{ mod.description || 'Sin descripción' }}</p>
                </div>

                <div class="flex items-center justify-end gap-1">
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

            <div v-if="store.modules.length === 0"
                class="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                <p class="text-muted-foreground">No hay funcionalidades registradas.</p>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <Modal :show="showModal" :title="isNew ? 'Nueva Funcionalidad' : 'Editar Funcionalidad'" @close="showModal = false">
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre de la Funcionalidad</label>
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

                    <!-- <div class="md:col-span-1">
                        <label class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Orden</label>
                        <input type="number" v-model.number="editing.order"
                            class="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none" />
                    </div> -->

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
    </div>
</template>
