import { App } from 'vue';
import { LibConfig, config as libConfig } from './types/lib-config-type';
import AppLayout from './components/AppLayout.vue';
import Dashboard from './pages/Dashboard.vue';
import CourseView from './pages/CourseView.vue';
import LessonView from './pages/LessonView.vue';
import AdminPanel from './pages/AdminPanel.vue';

// Export components for individual use
export {
  AppLayout,
  Dashboard,
  CourseView,
  LessonView,
  AdminPanel
};

// Export types
export type { LibConfig };

// Export the plugin
export default {
  install: (app: App, options: LibConfig) => {
    // Inject configuration
    if (options) {
      Object.assign(libConfig, options);
    }

    // Register global components if needed
    app.component('AlihtAcademyHub', AppLayout);
  }
};
