import './assets/main.css'
import { createAIService } from '@/services/aiService'
import spinDirective from '@/directives/v-loading';

const aiService = createAIService()
import { createApp } from 'vue'
import { createPinia } from 'pinia'


import App from './App.vue'

const app = createApp(App)

app
  .use(createPinia())
  .directive('loading', spinDirective)
  .provide('aiService', aiService)
  .mount('#app')
