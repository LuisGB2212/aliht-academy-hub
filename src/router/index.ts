import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'
import CourseView from '@/pages/CourseView.vue'
import LessonView from '@/pages/LessonView.vue'
import AdminPanel from '@/pages/AdminPanel.vue'
import NotFound from '@/pages/NotFound.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/curso/:categoryId', component: CourseView },
    { path: '/curso/:categoryId/leccion/:lessonId', component: LessonView },
    { path: '/admin', component: AdminPanel },
    { path: '/admin/:pathMatch(.*)*', component: AdminPanel },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
})

export default router
