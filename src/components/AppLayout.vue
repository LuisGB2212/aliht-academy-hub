<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme-branding'
import { ShieldAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isAdminView = computed(() => String(route.name || '').startsWith('admin'))

const themeStore = useThemeStore()
themeStore.setThemeByDomain()

const authStore = useAuthStore()
authStore.init()
</script>

<template>
    <div class="transition-colors duration-500" :class="isAdminView ? 'admin-theme' : 'user-theme'"
        style="background-color: hsl(var(--background))">

        {{ authStore.isAuthenticated }}
        
        <main class="w-full transition-all duration-500 mx-auto" v-if="authStore.isAuthenticated">
            <slot />
        </main>
        <main class="w-full transition-all duration-500 mx-auto" v-else>
            <!-- Pagina no tiene acceso a esta seccion -->
            <div class="flex items-center justify-center h-screen">
                <div class="text-center">
                    <ShieldAlert class="w-12 h-12 mx-auto mb-4" />
                    <h1 class="text-4xl font-bold">No tienes acceso a esta sección</h1>
                    <p class="text-lg text-muted-foreground pt-2">Por favor, inicia sesión en tú plataforma para acceder a esta sección</p>
                </div>
            </div>
        </main>
        
        <!-- Optional Footer Placeholder -->
        <footer class="fixed bottom-8 left-0 w-full text-center text-xs text-muted-foreground/40 font-medium uppercase tracking-[0.15em]">
            &copy; 2026 Academia Aliht Corporativo • Base de conocimiento
        </footer>
    </div>
</template>
