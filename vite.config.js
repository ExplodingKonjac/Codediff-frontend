// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevtools from 'vite-plugin-vue-devtools'
import path from 'path'
import { fileURLToPath } from 'url'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    VueDevtools(),
    tailwindcss(),
    monacoEditorPlugin.default({})
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'monaco-editor',
      `monaco-editor/esm/vs/language/json/json.worker`,
      `monaco-editor/esm/vs/language/css/css.worker`,
      `monaco-editor/esm/vs/language/html/html.worker`,
      `monaco-editor/esm/vs/language/typescript/ts.worker`,
      `monaco-editor/esm/vs/editor/editor.worker`
    ],
  },
  server: {
    hmr: true,
    // 关键修复：添加文件系统访问权限
    fs: {
      // 允许访问项目根目录
      allow: [
        path.resolve(__dirname),
        // 允许访问 node_modules
        path.resolve(__dirname, 'node_modules'),
        // 允许访问父目录（如果需要）
        path.resolve(__dirname, '..')
      ],
      // 严格模式设为 false
      strict: false
    }
  },
  // 关键：添加 worker 配置
  assetsInclude: ['**/*.worker.js'],
  // 添加自定义中间件
  configureServer: (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/node_modules/monaco-editor')) {
        req.url = req.url.replace('/node_modules/monaco-editor', '/monaco-editor');
      }
      next();
    });
  }
})