<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Platform } from '@/types/academy-type'
import { 
    Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2, 
    Monitor, Globe, ImageIcon
} from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'

const store = useLmsStore()
const showModal = ref(false)
const editing = ref<Partial<Platform>>({})
const isNew = ref(false)
const isSubmitting = ref(false)

function startNew() {
    isNew.value = true
    editing.value = {
        name: '',
        description: '',
        image_url: '',
        color: '#3597d4',
        visible: true,
    }
    showModal.value = true
}

function startEdit(plat: Platform) {
    isNew.value = false
    editing.value = { ...plat }
    showModal.value = true
}

async function handleSave() {
    if (!editing.value.name) return

    isSubmitting.value = true
    try {
        if (isNew.value) {
            await store.createPlatform(editing.value)
        } else {
            await store.updatePlatform(editing.value.id!, editing.value)
        }
        showModal.value = false
        editing.value = {}
    } catch (error) {
        console.error('Error saving platform:', error)
    } finally {
        isSubmitting.value = false
    }
}

async function handleDelete(id: number) {
    if (confirm('¿Estás seguro de eliminar esta plataforma?')) {
        await store.deletePlatform(id)
    }
}

async function toggleVisibility(platform: Platform) {
    await store.updatePlatform(platform.id, { visible: !platform.visible })
}

onMounted(() => {
    store.fetchPlatforms()
})
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-foreground">Plataformas</h2>
                <p class="text-sm text-muted-foreground text-pretty">Define las marcas o entornos (Aliht, Nextravel, Bestravel) que consumirán el contenido.</p>
            </div>
            <button @click="startNew"
                class="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Plus class="w-4 h-4" />
                Nueva Plataforma
            </button>
        </div>

        <!-- Loading -->
        <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-2" />
            <p>Cargando plataformas...</p>
        </div>

        <!-- List -->
        <div v-else class="grid gap-3">
            <div v-for="platform in store.platforms" :key="platform.id"
                class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-105 hover:cursor-pointer">
                <div class="hidden md:block cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
                    <GripVertical class="w-4 h-4 text-muted-foreground" />
                </div>

                <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner bg-muted overflow-hidden"
                :style="`background-color: ${platform.color || '#3597d4'}15`">
                    <img v-if="platform.image_url" :src="platform.image_url" :alt="platform.name" class="w-10 h-10 object-cover" />
                    <Monitor v-else class="w-6 h-6 text-muted-foreground/40" />
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-bold text-base text-foreground">{{ platform.name }}</h3>
                        <span v-if="!platform.visible" class="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase">Oculto</span>
                    </div>
                    <p class="text-xs text-muted-foreground truncate">{{ platform.description || 'Videos y guías rápidas para completar cada proceso' }}</p>
                </div>

                <div class="flex items-center gap-1.5">
                    <button @click="toggleVisibility(platform)" class="p-2.5 rounded-xl transition-all"
                        :class="platform.visible ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'"
                        :title="platform.visible ? 'Visible' : 'Oculto'">
                        <Eye v-if="platform.visible" class="w-4 h-4" />
                        <EyeOff v-else class="w-4 h-4" />
                    </button>
                    <button @click="startEdit(platform)"
                        class="p-2.5 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        <Edit class="w-4 h-4" />
                    </button>
                    <button @click="handleDelete(platform.id)"
                        class="p-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div v-if="store.platforms.length === 0"
                class="text-center py-16 border-2 border-dashed border-border rounded-3xl bg-muted/20">
                <Globe class="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p class="text-muted-foreground font-medium text-sm">No hay plataformas configuradas.</p>
                <button @click="startNew" class="mt-4 text-xs font-bold text-primary hover:underline">Crear la primera plataforma</button>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <Modal :show="showModal" :title="isNew ? 'Nueva Plataforma' : 'Editar Plataforma'" @close="showModal = false">
            <div class="space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Nombre de la Plataforma</label>
                        <input v-model="editing.name" placeholder="Ej: Aliht, Nextravel..."
                            class="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background text-sm font-bold shadow-sm shadow-black/5 outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                    </div>

                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Color de Marca</label>
                        <div class="flex gap-3 items-center">
                            <div class="relative group">
                                <input type="color" v-model="editing.color" 
                                    class="w-12 h-12 rounded-xl border-2 border-input p-0.5 cursor-pointer bg-background overflow-hidden" />
                            </div>
                            <input v-model="editing.color"
                                class="flex-1 px-4 py-3 rounded-xl border border-input bg-background/50 text-xs font-mono font-bold outline-none uppercase" />
                        </div>
                    </div>

                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">URL de Imagen de Marca (Logo)</label>
                        <div class="flex gap-4 items-center">
                            <div class="w-16 h-16 rounded-xl bg-muted shrink-0 flex items-center justify-center overflow-hidden border border-border">
                                <img v-if="editing.image_url" :src="editing.image_url" class="w-full h-full object-cover" />
                                <ImageIcon v-else class="w-6 h-6 text-muted-foreground/30" />
                            </div>
                            <input v-model="editing.image_url" placeholder="https://ejemplo.com/logo.png"
                                class="flex-1 px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background text-sm outline-none shadow-sm shadow-black/5 focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                    </div>

                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Descripción (Opcional)</label>
                        <textarea v-model="editing.description" rows="3"
                            placeholder="Describe brevemente el propósito de esta plataforma..."
                            class="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background text-sm resize-none outline-none shadow-sm shadow-black/5 transition-all" />
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
                    {{ isSubmitting ? 'Guardando...' : (isNew ? 'Crear Plataforma' : 'Guardar Cambios') }}
                </button>
            </template>
        </Modal>
    </div>
</template>


