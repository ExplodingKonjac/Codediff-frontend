import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'
// import { configureMonaco } from './monaco-config'

// 确保在其他导入之前导入 monaco
// import * as monaco from 'monaco-editor'

// 在 Vue 实例前配置 Monaco
// configureMonaco()

// 注册全局组件
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, { size: 'default', zIndex: 3000 })

// 全局注册 Element Plus 图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 全局注册图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 挂载前确保 Monaco 配置
// app.config.globalProperties.$monaco = monaco

app.mount('#app')