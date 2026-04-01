<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

function setThemeBySubdomain() {
  const host = window.location.hostname;
  const subdomain = host.split('.')[0];
  console.log(window.location);  

  const themes = {
    admin: {
      primary: "220 38 38",   // rojo
      secondary: "251 191 36"
    },
    client: {
      primary: "34 197 94",   // verde
      secondary: "59 130 246"
    },
    default: {
      primary: "200 64% 52%",  // azul
      secondary: "200 20% 94%"
    }
  };

  const theme = themes[subdomain as keyof typeof themes] || themes.default;
  console.log(theme);
  const root = document.documentElement;

  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--secondary', theme.secondary);
}

setThemeBySubdomain();

</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
