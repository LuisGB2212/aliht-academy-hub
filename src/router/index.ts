import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'
import CourseView from '@/pages/CourseView.vue'
import LessonView from '@/pages/LessonView.vue'
import AdminPanel from '@/pages/AdminPanel.vue'
import NotFound from '@/pages/NotFound.vue'
import { config } from '@/types/lib-config-type'

/**
 * Crea una instancia nueva del router.
 * Se exporta como factory para que la librería pueda instanciarlo después de cargar la configuración.
 */
export function createAcademyRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: Dashboard, name: 'dashboard' },
      { path: '/plataforma/:categoryId', component: CourseView, name: 'course' },
      { path: '/plataforma/:categoryId/leccion/:lessonId', component: LessonView, name: 'lesson' },
      { path: '/admin', component: AdminPanel, name: 'admin' },
      { path: '/admin/:pathMatch(.*)*', component: AdminPanel },
      { path: '/:pathMatch(.*)*', component: NotFound },
    ],
  })

  /**
   * Guard: bloquea /admin cuando hay agencyIdentifier configurado.
   * Con agencyIdentifier = modo usuario → no puede acceder al panel de administración.
   * Sin agencyIdentifier = modo admin libre → puede acceder a todo.
   */
  router.beforeEach((to) => {
    const token = to.query.token;
    const subdomain = to.query.subdomain;
    if (subdomain) {
      localStorage.setItem('subdomain', subdomain as string);
    }
    
    if (token) {
      localStorage.setItem('authToken', token as string);
      config.apiToken = token as string;
      return {
        name: 'dashboard', 
      };
    }


    const isAdminRoute = String(to.name || '').startsWith('admin') || to.path.startsWith('/admin')
    if (isAdminRoute && config.agencyIdentifier) {
      // Redirige al usuario a su plataforma en lugar del admin
      return { name: 'course', params: { categoryId: config.agencyIdentifier } }
    }
    if (config.agencyIdentifier && to.params.categoryId && config.agencyIdentifier != Number(to.params.categoryId)) {
      // Redirige al usuario a su plataforma en lugar del admin
      return { name: 'course', params: { categoryId: config.agencyIdentifier } }
    }
  })

  return router
}

// Instancia por defecto para el dev sandbox
const router = createAcademyRouter()

export default router
