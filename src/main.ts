import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/index.css'
import AlihtAcademyHubPlugin, { setLibConfig } from './index'

// 1. Configure BEFORE anything else so router base is correct
// setLibConfig({
//   apiBaseUrl: 'http://127.0.0.1:8000/api',
//   agencyIdentifier: 'demo-agency',
//   apiToken: '123',
//   cloudFrontUrl: 'https://d234567890.cloudfront.net'
// })

const app = createApp(App)
app.use(createPinia())

const host = window.location.hostname
const allowedDomains = { 'aliht': 1, 'nextravel': 2, 'bestravel': 3 }
const matchedDomain = allowedDomains[host] ?? 1

// 2. Use the plugin — it will create the router AFTER config is set
app.use(AlihtAcademyHubPlugin, {
  apiBaseUrl: 'https://api.aliht.com.mx/api',
  agencyIdentifier: matchedDomain === 1 ? null : matchedDomain,
  apiToken: '123',
  cloudFrontUrl: 'https://dnsehdeeiyifd.cloudfront.net',
  isAdmin: true,
})

app.mount('#app')
