// stores/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/academy-type'
import { config } from '@/types/lib-config-type'
import { apiRepository } from '@/utils/apiRepository'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const isAuthenticated = ref(false)

  const init = async () => {
    loading.value = true

    try {
        if (config.agencyIdentifier == 1) {
            // La peticion va a aliht
            const data = await apiRepository.get<User>({
                endpoint: '/admin/user',
            })
            console.log(data.success);
            loading.value = false;
            user.value = data.data;
            isAuthenticated.value = true;
        } else {
            let hostname  = location.hostname;
            let domain    = hostname;
            let subdomain = "";

            if (hostname.includes(".")) {
                subdomain = hostname.split(".")[0];
                domain    = hostname.split(".").slice(1).join(".");
            }

            console.log(subdomain);
            console.log(domain);

            // La peticion va a la agencia
            const data = await apiRepository.get<User>({
                endpoint: '/admin/user',
            })
            user.value = data.data;
            loading.value = false;
            isAuthenticated.value = true;
        }
    } catch (error) {
        console.error(error)
        loading.value = false
        isAuthenticated.value = false
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    init,
  }
})