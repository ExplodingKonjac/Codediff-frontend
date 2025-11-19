<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSessions, createSession } from '@/api/sessions'
import { ElMessage, ElMessageBox } from 'element-plus'
import SessionCard from '@/components/SessionCard.vue'
// 正确导入图标
import { Plus as PlusIcon } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const sessions = ref([])
const loading = ref(true)

const fetchSessions = async () => {
  try {
    loading.value = true
    const response = await getSessions()
    sessions.value = response.data.sessions || []
  } catch (error) {
    ElMessage.error(`Failed to load sessions: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const createNewSession = async () => {
  try {
    loading.value = true

    // 创建默认会话数据
    const defaultSessionData = {
      title: `New Session ${sessions.value.length + 1}`,
      description: '',
      user_code: {
        lang: 'cpp',
        std: 'c++17',
        content: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
      },
      std_code: {
        lang: 'cpp',
        std: 'c++17',
        content: `#include <iostream>
using namespace std;

int main() {
    // Standard solution
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
      },
      gen_code: {
        lang: 'cpp',
        std: 'c++17',
        content: `#include <iostream>
#include <random>
using namespace std;

int main() {
    random_device rd;
    mt19937 gen(rd());
    uniform_int_distribution<> dis(1, 100);
    
    int a = dis(gen);
    int b = dis(gen);
    cout << a << " " << b << endl;
    return 0;
}`,
      },
    }

    // 调用 API 创建新会话
    const response = await createSession(defaultSessionData)

    if (response.data && response.data.id) {
      // 获取新创建的会话数据
      const newSession = response.data

      // 添加到会话列表
      sessions.value.unshift(newSession)

      ElMessage.success('New session created successfully!')

      // 跳转到新会话详情页
      router.push(`/sessions/${newSession.id}`)
    } else {
      throw new Error('Invalid response from server')
    }
  } catch (error) {
    console.error('Create session error:', error)

    // 详细的错误处理
    let errorMessage = 'Failed to create session'
    if (error.response) {
      // 服务器响应错误
      if (error.response.status === 401) {
        errorMessage = 'Authentication required. Please login again.'
        authStore.logout()
        router.push('/login')
      } else if (error.response.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid session data'
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else {
        errorMessage = `Server error (${error.response.status})`
      }
    } else if (error.request) {
      // 请求已发送但无响应
      errorMessage = 'Network error. Please check your connection.'
    } else {
      // 其他错误
      errorMessage = error.message || 'Unknown error occurred'
    }

    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 修复：使用 Vue 事件处理而不是 window 事件
const handleTitleUpdated = ({ id, title }) => {
  const session = sessions.value.find((s) => s.id === id)
  if (session) {
    session.title = title
  }
}

const handleSessionDeleted = ({ id }) => {
  sessions.value = sessions.value.filter((s) => s.id !== id)
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchSessions()
    // 修复：移除 window 事件监听
    // window.addEventListener('session-deleted', handleSessionDeleted)
    // window.addEventListener('title-updated', handleTitleUpdated)
  } else {
    router.push('/login')
  }
})

onUnmounted(() => {
  // 修复：移除 window 事件监听
  // window.removeEventListener('session-deleted', handleSessionDeleted)
  // window.removeEventListener('title-updated', handleTitleUpdated)
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">My Diff Sessions</h1>

      <el-button
        type="primary"
        @click="createNewSession"
        :loading="loading"
        class="flex items-center gap-2 px-6 py-3 font-medium text-lg shadow-md hover:shadow-lg transition-shadow"
      >
        <el-icon class="text-xl"><PlusIcon /></el-icon>
        <span>New Session</span>
      </el-button>
    </div>

    <div v-if="loading" class="space-y-6">
      <el-skeleton :rows="4" animated />
      <el-skeleton :rows="4" animated />
    </div>

    <div
      v-else-if="sessions.length === 0"
      class="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300"
    >
      <el-icon class="text-gray-400 text-5xl mb-6"><DocumentRemoveIcon /></el-icon>
      <p class="text-xl text-gray-600 mb-4">No sessions created yet</p>
      <el-button type="primary" size="large" @click="createNewSession" class="px-8 py-4">
        <el-icon class="mr-2"><PlusIcon /></el-icon>
        Create Your First Session
      </el-button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <SessionCard
        v-for="session in sessions"
        :key="session.id"
        :session="session"
        @title-updated="handleTitleUpdated"
        @session-deleted="handleSessionDeleted"
      />
    </div>
  </div>
</template>

<style scoped>
.container {
  margin: 0 auto;
  max-width: 1440px;
  padding: 0 2rem;
}

/* 确保卡片容器有白色背景 */
.card-container {
  background-color: white;
  border-radius: 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}
</style>
