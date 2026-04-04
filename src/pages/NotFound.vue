<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'

const route = useRoute()
onMounted(() => {
    console.error('404 Error: User attempted to access non-existent route:', route.path)
})
</script>

<template>
    <div class="flex min-h-[60vh] items-center justify-center">
        <div class="text-center">
            <h1 class="mb-4 text-4xl font-bold text-foreground">404</h1>
            <p class="mb-4 text-xl text-muted-foreground">Página no encontrada</p>
            <RouterLink to="/" class="text-primary underline hover:opacity-80 transition-opacity">
                Volver al inicio
            </RouterLink>
        </div>
    </div>
</template>
