<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useLmsStore } from '@/stores/aliht-context-store'
import { config } from '@/types/lib-config-type'
import { ArrowRight, Globe, Monitor } from 'lucide-vue-next'

const store = useLmsStore()
const router = useRouter()

async function initDashboard() {
    await store.fetchPlatforms()

    /**
     * Si hay agencyIdentifier configurado, redirigimos directamente a esa plataforma.
     * El agencyIdentifier actúa como identificador de la plataforma asignada al usuario.
     * Esto convierte a AlihtAcademyUserHub en una entrada directa sin selección de plataforma.
     */
    if (config.agencyIdentifier && store.platforms.length > 0) {
        router.replace({ name: 'course', params: { categoryId: config.agencyIdentifier } })
        return
    }

    // Sin agencyIdentifier: carga el contenido del primer dashboard para mostrar progreso
    if (store.platforms.length > 0) {
        await store.fetchPlatformContent(store.platforms[0].id)
    }
}

onMounted(() => {
    initDashboard()
})

const getProgress = (platformId: number) => store.getCourseProgress(platformId)
</script>

<template>
    <div class="flex items-center justify-center min-h-screen">
        <div v-if="!config.agencyIdentifier">
            <!-- Header -->
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Bienvenido a la <span class="gradient-text">Academia Corporativa</span>
                    </h1>
                    <p class="text-muted-foreground">
                        Encuentra rápidamente cómo realizar tareas dentro de la plataforma con guías y videos paso a paso.
                    </p>
                </div>
                <div>
                    <img src="../assets/images/logo_aliht.png" alt="Logo Aliht" class="w-90 h-auto">
                </div>
            </div>

            <!-- Platform Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <RouterLink v-for="platform in store.platforms.filter(p => p.visible)" :key="platform.id"
                    :to="{ name: 'course', params: { categoryId: platform.id } }"
                    class="bg-card rounded-2xl border border-border overflow-hidden card-hover group shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all">
                    <!-- Color bar -->
                    <div class="h-2 w-full"
                        :style="`background: linear-gradient(90deg, ${platform.color || '#3597d4'}, ${platform.color || '#3597d4'}88)`" />
                    <div class="p-6">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden border border-border"
                                :style="`background-color: ${platform.color || '#3597d4'}15`">
                                <img v-if="platform.image_url" :src="platform.image_url" class="w-14 h-14 object-cover" />
                                <Monitor v-else class="w-6 h-6" :style="`color: ${platform.color || '#3597d4'}`" />
                            </div>
                            <div class="min-w-0">
                                <h3
                                    class="font-bold text-foreground text-lg group-hover:text-primary transition-colors truncate">
                                    {{ platform.name }}
                                </h3>
                                <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{{
                                    platform.description || 'Academia corporativa de ' + platform.name }}</p>
                            </div>
                        </div>

                        <!-- Simplified Info -->
                        <div class="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                            <div class="flex items-center gap-1.5">
                                <div class="flex -space-x-2">
                                    <div v-for="i in 3" :key="i"
                                        class="w-5 h-5 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold">
                                        {{ i }}
                                    </div>
                                </div>
                                <span class="text-[11px] text-muted-foreground font-medium ml-1">
                                    {{ getProgress(platform.id).totalLessons }} contenidos
                                </span>
                            </div>
                            <span
                                class="text-xs font-bold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                                Explorar
                                <ArrowRight class="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </RouterLink>
            </div>

            <!-- Empty state -->
            <div v-if="store.platforms.filter(p => p.visible).length === 0"
                class="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border mt-6">
                <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe class="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 class="text-lg font-bold text-foreground">No se encontraron resultados</h3>
                <p class="text-muted-foreground text-sm max-w-xs mx-auto">Prueba ajustando tus filtros o términos de búsqueda.</p>
            </div>
        </div>
        <div v-else>
            <div></div>
        </div>
    </div>
</template>
