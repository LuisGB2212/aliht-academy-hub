<script setup lang="ts">
import { onMounted } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import { usePlatformForm } from '@/composables/usePlatformForm'
import {
  Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Loader2,
  Monitor, Globe, UploadCloud, CheckCircle2, AlertCircle, X
} from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'

const store = useLmsStore()

const {
  showModal,
  editing,
  isNew,
  isSubmitting,
  logoUpload,
  startNew,
  startEdit,
  handleSave,
  handleDelete,
  toggleVisibility,
  handleLogoUpload,
  imageAccept,
} = usePlatformForm()

function onLogoFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  handleLogoUpload(file)
  input.value = ''
}

onMounted(() => {
  store.fetchPlatforms()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-foreground">Plataformas</h2>
        <p class="text-sm text-muted-foreground text-pretty">
          Define las marcas o entornos (Aliht, Nextravel, Bestravel) que consumirán el contenido.
        </p>
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
        class="flex flex-col md:flex-row md:items-center gap-4 bg-card rounded-xl p-4 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md hover:scale-[1.01] hover:cursor-pointer">
        <div class="hidden md:block cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical class="w-4 h-4 text-muted-foreground" />
        </div>

        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner bg-muted overflow-hidden"
          :style="`background-color: ${platform.color || '#3597d4'}15`">
          <img v-if="platform.image_url" :src="platform.image_url" :alt="platform.name"
            class="w-10 h-10 object-cover" />
          <Monitor v-else class="w-6 h-6 text-muted-foreground/40" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-bold text-base text-foreground">{{ platform.name }}</h3>
            <span v-if="!platform.visible"
              class="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase">
              Oculto
            </span>
          </div>
          <p class="text-xs text-muted-foreground truncate">
            {{ platform.description || 'Videos y guías rápidas para completar cada proceso' }}
          </p>
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
        <button @click="startNew" class="mt-4 text-xs font-bold text-primary hover:underline">
          Crear la primera plataforma
        </button>
      </div>
    </div>

    <!-- ─── Create / Edit Modal ─────────────────────────────────────────────── -->
    <Modal :show="showModal" :title="isNew ? 'Nueva Plataforma' : 'Editar Plataforma'" @close="showModal = false">
      <div class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- Name -->
          <div class="md:col-span-2">
            <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Nombre de la Plataforma
            </label>
            <input v-model="editing.name" placeholder="Ej: Aliht, Nextravel..."
              class="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background text-sm font-bold shadow-sm shadow-black/5 outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
          </div>

          <!-- Brand color -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Color de Marca
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" v-model="editing.color"
                class="w-12 h-12 rounded-xl border-2 border-input p-0.5 cursor-pointer bg-background overflow-hidden" />
              <input v-model="editing.color"
                class="flex-1 px-4 py-3 rounded-xl border border-input bg-background/50 text-xs font-mono font-bold outline-none uppercase" />
            </div>
          </div>

          <!-- Logo upload -->
          <div class="md:col-span-2">
            <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Logo de la Plataforma
            </label>
            <div class="flex gap-4 items-start">
              <!-- Preview -->
              <div class="w-16 h-16 rounded-xl bg-muted shrink-0 flex items-center justify-center overflow-hidden border border-border">
                <img v-if="editing.image_url" :src="editing.image_url" class="w-full h-full object-cover" />
                <Monitor v-else class="w-6 h-6 text-muted-foreground/30" />
              </div>

              <div class="flex-1 space-y-2">
                <!-- Existing URL preview -->
                <div v-if="editing.image_url && !logoUpload.isUploading"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border border-success/30 bg-success/5 text-xs text-success font-mono">
                  <CheckCircle2 class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate flex-1">{{ editing.image_url }}</span>
                  <button type="button" @click="editing.image_url = ''"
                    class="shrink-0 hover:text-destructive transition-colors">
                    <X class="w-3 h-3" />
                  </button>
                </div>

                <!-- Upload zone -->
                <label class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group/logo"
                  :class="logoUpload.isUploading ? 'pointer-events-none' : ''">
                  <input type="file" class="hidden" :accept="imageAccept" @change="onLogoFileChange" />

                  <template v-if="logoUpload.isUploading">
                    <Loader2 class="w-4 h-4 text-primary animate-spin shrink-0" />
                    <div class="flex-1">
                      <div class="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Subiendo imagen...</span>
                        <span class="font-bold text-primary">{{ logoUpload.progress }}%</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div class="h-full bg-primary rounded-full transition-all duration-300"
                          :style="`width: ${logoUpload.progress}%`" />
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <UploadCloud class="w-4 h-4 text-muted-foreground group-hover/logo:text-primary transition-colors" />
                    <span class="text-xs text-muted-foreground group-hover/logo:text-primary transition-colors">
                      {{ editing.image_url ? 'Reemplazar logo' : 'Subir logo' }}
                    </span>
                    <span class="ml-auto text-[10px] text-muted-foreground/60">JPG, PNG, WEBP • máx. 5 MB</span>
                  </template>
                </label>

                <!-- Or paste URL manually -->
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    O pega URL
                  </span>
                  <input v-model="editing.image_url"
                    placeholder="https://cdn.ejemplo.com/logo.png"
                    class="w-full pl-20 pr-4 py-2 rounded-xl border border-input bg-background/30 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>

                <!-- Upload error -->
                <p v-if="logoUpload.error"
                  class="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
                  <AlertCircle class="w-3 h-3" />
                  {{ logoUpload.error }}
                </p>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="md:col-span-2">
            <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Descripción (Opcional)
            </label>
            <textarea v-model="editing.description" rows="3"
              placeholder="Describe brevemente el propósito de esta plataforma..."
              class="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background text-sm resize-none outline-none shadow-sm shadow-black/5 transition-all focus:ring-2 focus:ring-primary/20" />
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
