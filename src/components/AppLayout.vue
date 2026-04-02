<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isAdminView = computed(() => route.path.startsWith('/admin'))

</script>

<template>
    <div class="transition-colors duration-500" :class="isAdminView ? 'admin-theme' : 'user-theme'"
        style="background-color: hsl(var(--background))">
        
        <main class="w-full transition-all duration-500 mx-auto">
            <slot />
        </main>
        
        <!-- Optional Footer Placeholder -->
        <footer class="fixed bottom-8 left-0 w-full text-center text-xs text-muted-foreground/40 font-medium uppercase tracking-[0.15em]">
            &copy; 2026 Academia Aliht Corporativo • Base de conocimiento
        </footer>
    </div>
</template>
