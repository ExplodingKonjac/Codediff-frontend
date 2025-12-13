<script setup>
import { onMounted } from 'vue'
import Header from '@/components/Header.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // 监听创建新会话事件
  window.addEventListener('create-session', () => {
    if (authStore.isAuthenticated) {
      const event = new CustomEvent('new-session-requested')
      window.dispatchEvent(event)
    } else {
      // 未登录时跳转到登录页
      window.location.href = '/login'
    }
  })
})
</script>

<template>
  <Header />
  <main class="pt-[var(--header-height)]">
    <router-view />
  </main>
</template>

<style scoped>
main {
  min-height: calc(100vh - var(--header-height));
}
</style>
