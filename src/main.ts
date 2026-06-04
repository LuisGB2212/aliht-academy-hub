import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/index.css'
import AlihtAcademyHubPlugin, { setLibConfig } from './index'

import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

// 1. Configure BEFORE anything else so router base is correct
// setLibConfig({
//   apiBaseUrl: 'http://127.0.0.1:8000/api',
//   agencyIdentifier: 'demo-agency',
//   apiToken: '123',
//   cloudFrontUrl: 'https://d234567890.cloudfront.net'
// })

const app = createApp(App)
app.use(createPinia())
app.use(Vue3Toastify, {
    autoClose: 5000,
    theme: 'light',
    transition: 'bounce',
    position: 'top-right', // topRight es el estándar moderno
    pauseOnHover: true,
    closeOnClick: true,
} as ToastContainerOptions);

// { 'aliht': 1, 'nextravel': 2, 'bestravel': 3 }

const agencyIdentifier = import.meta.env.VITE_APP_AGENCY_IDENTIFIER ?? 1

// 2. Use the plugin — it will create the router AFTER config is set
app.use(AlihtAcademyHubPlugin, {
    apiBaseUrl: 'https://api.aliht.com.mx/api',
    agencyIdentifier: Number(agencyIdentifier),
    apiToken: '123',
    cloudFrontUrl: 'https://dnsehdeeiyifd.cloudfront.net',
    isAdmin: true,
})

app.mount('#app')
