import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import components from 'unplugin-vue-components/vite';
import { AntDesignXVueResolver } from 'ant-design-x-vue/resolver';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';


// https://vite.dev/config/
export default defineConfig({
  server: {
    host: process.env.HOST || '0.0.0.0',
    proxy: {
      '/chat': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chat/, '/chat'),
        target: 'http://192.168.1.147:16070',
      }
    }
  },
  plugins: [
    vue(),
    components({
      resolvers: [
        AntDesignXVueResolver(),
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
