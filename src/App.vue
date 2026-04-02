<script setup lang="ts">
import { AlihtAcademyAdminHub, AlihtAcademyUserHub, setLibConfig } from './index'
import AppLayout from '@/components/AppLayout.vue'
import { ref } from 'vue'

// Example: Simulating library configuration
setLibConfig({
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  agencyIdentifier: 'demo-agency',
  apiToken: 'your-token-here'
})

function setThemeBySubdomain() {
  const host = window.location.hostname; 

  const allowedDomains = ['nextravel', 'bestravel'];
  const matchedDomain = allowedDomains.find(domain => host.includes(domain)) ?? 'default';

  const themes = {
    bestravel: { primary: "50 98% 50%", secondary: "48 100% 40%" },
    nextravel: { primary: "355 85% 48%", secondary: "355 85% 48%" },
    default: { primary: "200 64% 52%", secondary: "200 64% 52%" }
  };

  const themeSelection = themes[matchedDomain as keyof typeof themes];
  const root = document.documentElement;

  root.style.setProperty('--primary', themeSelection.primary);
  root.style.setProperty('--secondary', themeSelection.secondary);
}

setThemeBySubdomain();

const currentHub = ref<'user' | 'admin'>('user')

</script>

<template>
  <!-- <div class="p-4 border-b bg-muted/30 flex justify-between items-center">
    <div>
      <span class="text-sm font-bold uppercase tracking-widest text-muted-foreground">Dev Sandbox</span>
    </div>
    <div class="flex gap-2">
      <button 
        @click="currentHub = 'user'" 
        class="px-3 py-1 text-xs rounded-full transition-colors"
        :class="currentHub === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
      >
        User Hub
      </button>
      <button 
        @click="currentHub = 'admin'" 
        class="px-3 py-1 text-xs rounded-full transition-colors"
        :class="currentHub === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
      >
        Admin Hub
      </button>
    </div>
  </div> -->

  <AppLayout>
    <RouterView v-if="true /* Using router for full functionality in dev */" />
    
    <!-- 
      Example of direct component usage if not using router: -->
      <!-- <AlihtAcademyUserHub v-if="currentHub === 'user'" />
      <AlihtAcademyAdminHub v-else /> -->
    <!-- -->
  </AppLayout>
</template>

<style>
/* Ensure we have some base styles for the demo */
/* :root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
} */
</style>

