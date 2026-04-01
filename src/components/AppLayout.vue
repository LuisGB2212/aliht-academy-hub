<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import { GraduationCap, Shield, LogOut, User, Menu, X, ChevronRight, LayoutDashboard, Settings } from 'lucide-vue-next'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()

const isAdminView = computed(() => route.path.startsWith('/admin'))

</script>

<template>
    <div class="min-h-screen transition-colors duration-500" :class="isAdminView ? 'admin-theme' : 'user-theme'"
        style="background-color: hsl(var(--background))">
        
        <main class="w-full transition-all duration-500 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
            <slot />
        </main>
        
        <!-- Optional Footer Placeholder -->
        <footer class="mt-auto py-8 text-center text-xs text-muted-foreground/40 font-medium uppercase tracking-[0.15em]">
            &copy; 2026 Academia Aliht Corporativo • Base de conocimiento
        </footer>
    </div>
</template>
