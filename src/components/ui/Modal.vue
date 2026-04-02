<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onUnmounted(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-xs" @click="emit('close')"></div>

        <!-- Modal Content -->
        <Transition
          enter-active-class="transition duration-300 ease-out transform"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in transform"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div v-if="show" class="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-border flex items-center justify-between gradient-bg">
              <h3 class="text-lg font-bold text-primary-foreground">{{ title }}</h3>
              <button
                @click="emit('close')"
                class="p-1 rounded-lg hover:bg-white/10 text-primary-foreground transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 max-h-[80vh] overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Scoped styles if needed */
</style>
