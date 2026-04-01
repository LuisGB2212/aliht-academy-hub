<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { GraduationCap, Shield } from 'lucide-vue-next'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
    <div class="min-h-screen" style="background-color: hsl(var(--background))">
        <!-- <header class="sticky top-0 z-30 backdrop-blur-lg border-b"
            style="background-color: hsl(var(--card) / 0.8); border-color: hsl(var(--border))">
            <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <RouterLink to="/" class="flex items-center gap-3 group">
                    <div class="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                        <GraduationCap class="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 class="text-sm font-bold text-foreground leading-tight">Academia Corporativa</h1>
                        <p class="text-[10px] text-muted-foreground font-medium">Aliht Group</p>
                    </div>
                </RouterLink>

                <RouterLink :to="isAdmin ? '/' : '/admin'"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:bg-[hsl(var(--muted))]">
                    <Shield class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ isAdmin ? 'Vista de Usuario' : 'Panel Admin' }}</span>
                </RouterLink>
            </div>
        </header> -->

        <main class="w-full p-4 md:p-6 lg:p-8">
            <slot />
        </main>
    </div>
</template>
