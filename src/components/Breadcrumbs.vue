<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

interface BreadcrumbItem {
    label: string
    to?: RouteLocationRaw
}

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
    <nav class="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
        <span v-for="(item, i) in items" :key="i" class="flex items-center gap-1.5">
            <ChevronRight v-if="i > 0" class="w-3.5 h-3.5" />
            <RouterLink v-if="item.to" :to="item.to" class="hover:text-primary transition-colors font-medium">
                {{ item.label }}
            </RouterLink>
            <span v-else class="text-foreground font-semibold">{{ item.label }}</span>
        </span>
    </nav>
</template>
