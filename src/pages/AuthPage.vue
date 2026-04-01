<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// import { supabase } from '@/integrations/supabase/client'
import { Loader2, AlertCircle } from 'lucide-vue-next'
// import { toast } from 'vue-sonner'
// import logo from '@/assets/images/logo_aliht.png'

const router = useRouter()

const loading = ref(true)
const errorStatus = ref<string | null>(null)

// const SILENT_PW = 'Auth_System_2026_Ext!'

onMounted(async () => {
    loading.value = true
    const token = localStorage.getItem('authToken')

    //   if (!token) {
    //     await supabase.auth?.signOut()
    //     errorStatus.value = 'No se encontró una sesión activa. Por favor, inicia sesión en el sistema principal.'
    //     loading.value = false
    //     return
    //   }

    try {
        // 1. Validar con API externa
        const response = await fetch('https://api.aliht.com.mx/api/admin/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        const userData = await response.json()

        if (!response.ok || userData.success === false) {
            throw new Error('Acceso denegado. Tu sesión ha expirado o no tienes permisos.')
        }

        const email = userData.user.email

        // 2. Intentar Login en Supabase
        // const { error: signInError } = await supabase.auth.signInWithPassword({
        //   email,
        //   password: SILENT_PW,
        // })

        // if (signInError) {
        //   // 3. Si no existe en Supabase, registrarlo automáticamente
        //   if (signInError.message.includes('Invalid login credentials')) {
        //     const { error: signUpError } = await supabase.auth.signUp({
        //       email,
        //       password: SILENT_PW,
        //       options: {
        //         data: {
        //           full_name: userData.user.name,
        //           profile_type: userData.user.profile?.name,
        //           user_id: userData.user.id,
        //           user_registered: 'ALIHT',
        //         },
        //       },
        //     })

        //     if (signUpError) throw signUpError

        //     // Re-intentar login tras registro
        //     await supabase.auth.signInWithPassword({ email, password: SILENT_PW })
        //   } else {
        //     throw signInError
        //   }
        // }

        // toast.success(`Bienvenido, ${userData.user.name}`)

    } catch (err: any) {
        errorStatus.value = err.message || 'Error de comunicación.'
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
        <div class="w-full max-w-sm">
            <div class="text-center space-y-4">

                <!-- Logo -->
                <div class="mx-auto p-3 w-fit">
                    <img src="../assets/images/logo_aliht.png" alt="logo" class="w-64 animate-pulse" />
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex flex-col items-center gap-3">
                    <Loader2 class="h-8 w-8 animate-spin text-primary" />
                    <p class="text-sm text-muted-foreground animate-pulse">
                        Sincronizando credenciales...
                    </p>
                </div>

                <!-- Error -->
                <div v-else-if="errorStatus"
                    class="space-y-4 bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                    <div class="flex justify-center">
                        <AlertCircle class="h-10 w-10 text-destructive" />
                    </div>
                    <h2 class="text-lg font-semibold text-destructive">Acceso Restringido</h2>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                        {{ errorStatus }}
                    </p>
                    <a href="https://portal.aliht.com.mx/admin/dashboard"
                        class="text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                        Volver al panel principal
                    </a>
                </div>

            </div>
        </div>
    </div>
</template>