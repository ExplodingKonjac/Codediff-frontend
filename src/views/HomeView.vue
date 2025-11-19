<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSessions, createSession } from '@/api/sessions'
import { ElMessage, ElMessageBox } from 'element-plus'
import SessionCard from '@/components/SessionCard.vue'
// 正确导入图标
import {
  Plus as PlusIcon,
  RefreshRight as RefreshRightIcon,
  Sort as SortIcon,
  DocumentRemove as DocumentRemoveIcon,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const sessions = ref([])
const loading = ref(true)

// ===== 新增：分页和排序状态 =====
const pagination = ref({
  page: 1,
  per_page: 10,
  total: 0,
  pages: 0,
})

const sortOptions = [
  { label: 'Update time', value: 'updated_at' },
  { label: 'Create time', value: 'created_at' },
  { label: 'Title', value: 'title' },
]

const sortOrderOptions = [
  { label: 'Descending', value: 'desc' },
  { label: 'Ascending', value: 'asc' },
]

const sortConfig = ref({
  sort: 'updated_at',
  order: 'desc',
})

// ===== 新增：获取分页会话列表 =====
const fetchSessions = async () => {
  try {
    loading.value = true

    const response = await getSessions({
      page: pagination.value.page,
      per_page: pagination.value.per_page,
      sort: sortConfig.value.sort,
      order: sortConfig.value.order,
    })

    sessions.value = response.data.sessions || []
    pagination.value = {
      page: response.data.page,
      per_page: response.data.per_page,
      total: response.data.total,
      pages: response.data.pages,
    }

    console.log('Pagination:', pagination.value)
  } catch (error) {
    console.error('Failed to load sessions:', error)
    ElMessage.error(`Failed to load sessions: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ===== 新增：分页变更处理 =====
const handlePageChange = (page) => {
  pagination.value.page = page
  fetchSessions()
}

const handlePageSizeChange = (size) => {
  pagination.value.per_page = size
  pagination.value.page = 1 // 重置到第一页
  fetchSessions()
}

// ===== 新增：排序变更处理 =====
const handleSortChange = () => {
  pagination.value.page = 1 // 排序变化时重置到第一页
  fetchSessions()
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
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <h1 class="text-3xl font-bold text-gray-800">My Diff Sessions</h1>

      <!-- ===== 重构：统一控制栏 ===== -->
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
        <!-- ===== 重构：排序控件容器 ===== -->
        <div class="h-10 flex items-center bg-white border border-gray-300 rounded-lg px-3">
          <el-space size="1em">
            <el-icon class="text-blue-500"><SortIcon /></el-icon>
            <span class="text-gray-700 font-medium mr-2 whitespace-nowrap">Sort By:</span>
            <el-select
              v-model="sortConfig.sort"
              @change="handleSortChange"
              class="!h-7 min-w-[120px] !border-0 !shadow-none"
              size="small"
            >
              <el-option
                v-for="option in sortOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <el-select
              v-model="sortConfig.order"
              @change="handleSortChange"
              class="!h-7 min-w-[120px] !border-0 !shadow-none"
              size="small"
            >
              <el-option
                v-for="option in sortOrderOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-space>
        </div>

        <!-- 按钮区域 -->
        <el-button
          type="primary"
          @click="createNewSession"
          class="flex items-center gap-2 h-10 px-4 font-medium shadow-md hover:shadow-lg transition-shadow"
        >
          <el-icon class="text-xl"><PlusIcon /></el-icon>
          <span>New Session</span>
        </el-button>

        <el-button
          type="default"
          @click="fetchSessions"
          :loading="loading"
          class="flex items-center gap-2 h-10 px-4"
          style="margin-left: 0"
        >
          <el-icon class="text-lg"><RefreshRightIcon /></el-icon>
          <span>Refresh</span>
        </el-button>
      </div>
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

    <!-- ===== 新增：分页控件 ===== -->
    <div
      v-if="!loading && sessions.length > 0"
      class="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div class="text-gray-600">
        Showing
        <span class="font-medium">{{ (pagination.page - 1) * pagination.per_page + 1 }}</span> to
        <span class="font-medium">{{
          Math.min(pagination.page * pagination.per_page, pagination.total)
        }}</span>
        of <span class="font-medium">{{ pagination.total }}</span> results
      </div>

      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[5, 10, 20, 50]"
        :page-size="pagination.per_page"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
        class="pagination-control"
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

/* 分页控件样式 */
:deep(.pagination-control .el-pagination) {
  justify-content: flex-end;
}

:deep(.pagination-control .el-pagination .el-pagination__total) {
  margin-right: 1rem;
}

:deep(.pagination-control .el-pagination .el-pagination__jump) {
  margin-left: 0.5rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .pagination-control {
    justify-content: center !important;
  }

  :deep(.pagination-control .el-pagination__sizes) {
    display: none;
  }
}
</style>
