import { App } from 'vue';
import { LibConfig, config as libConfig, setLibConfig } from './types/lib-config-type';
import { createAcademyRouter } from './router/index';
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

// Export types, config setter, and router factory
export type { LibConfig };
export { setLibConfig, createAcademyRouter };

// Export the plugin
export default {
  install: (app: App, options: LibConfig) => {
    // 1. Inject configuration FIRST (before router creation)
    if (options) {
      Object.assign(libConfig, options);
      setLibConfig(options);
    }

    // 2. Create router AFTER config is set so agencyIdentifier is available for base path
    const router = createAcademyRouter();
    app.use(router);
    
    app.provide('libConfig', libConfig);

    // Register global components if needed
    app.component('AlihtAcademyHub', AppLayout);
    app.component('AlihtAcademyUserHub', AlihtAcademyUserHub);
    app.component('AlihtAcademyAdminHub', AlihtAcademyAdminHub);
  }
};
