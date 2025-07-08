import './assets/main.css'
import { createAIService } from '@/services/aiService'

const aiService = createAIService()
import { createApp } from 'vue'
import { createPinia } from 'pinia'


import App from './App.vue'

const app = createApp(App)

app
  .use(createPinia())
  .provide('aiService', aiService)
  .mount('#app')
