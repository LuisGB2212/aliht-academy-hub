<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

// La configuración de la librería se establece en main.ts antes de montar la app
// para garantizar que el router use el agencyIdentifier correcto como base path.
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>