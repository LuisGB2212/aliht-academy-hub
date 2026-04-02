import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/index.css'
import AppLayout from './index'

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.use(AppLayout, {
  apiBaseUrl: 'http://127.0.0.1:8000',
  agencyIdentifier: 'demo-agency',
  apiToken: '123',
  cloudFrontUrl: 'https://d234567890.cloudfront.net'
});

app.mount('#app')
