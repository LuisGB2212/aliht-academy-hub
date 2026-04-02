import { App } from 'vue';
import { LibConfig, config as libConfig, setLibConfig } from './types/lib-config-type';
import AppLayout from './components/AppLayout.vue';
import Dashboard from './pages/Dashboard.vue';
import CourseView from './pages/CourseView.vue';
import LessonView from './pages/LessonView.vue';
import AdminPanel from './pages/AdminPanel.vue';

// Export components with specific requested names
export const AlihtAcademyUserHub = Dashboard;
export const AlihtAcademyAdminHub = AdminPanel;

// Export components for individual use
export {
  AppLayout,
  Dashboard,
  CourseView,
  LessonView,
  AdminPanel
};

// Export types and config setter
export type { LibConfig };
export { setLibConfig };

// Export the plugin
export default {
  install: (app: App, options: LibConfig) => {
    // Inject configuration
    if (options) {
      Object.assign(libConfig, options);
    }

    app.provide('libConfig', libConfig);

    // Register global components if needed
    app.component('AlihtAcademyHub', AppLayout);
    app.component('AlihtAcademyUserHub', AlihtAcademyUserHub);
    app.component('AlihtAcademyAdminHub', AlihtAcademyAdminHub);
  }
};

