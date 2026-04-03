import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'
import CourseView from '@/pages/CourseView.vue'
import LessonView from '@/pages/LessonView.vue'
import AdminPanel from '@/pages/AdminPanel.vue'
import NotFound from '@/pages/NotFound.vue'

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

export default router
