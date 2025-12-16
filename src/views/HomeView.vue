<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SessionCard from '@/components/SessionCard.vue'
import { ElMessage } from 'element-plus'
import {
  Plus as PlusIcon,
  RefreshRight as RefreshRightIcon,
  Sort as SortIcon,
  DocumentRemove as DocumentRemoveIcon,
} from '@element-plus/icons-vue'

import { useSessionsList } from '@/composables/useSessionsList'

const authStore = useAuthStore()
const router = useRouter()

const {
  sessions,
  loading,
  pagination,
  sortConfig,
  sortOptions,
  sortOrderOptions,
  fetchSessions,
  handlePageChange,
  handlePageSizeChange,
  handleSortChange,
  createNewSession,
  handleTitleUpdated,
  handleSessionDeleted,
} = useSessionsList()

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchSessions()
  } else {
    router.push('/login')
  }
})

// Create Session Dialog Logic
const createSessionDialogVisible = ref(false)
const newSessionTitle = ref('')
const creating = ref(false)

const openCreateDialog = () => {
  newSessionTitle.value = ''
  createSessionDialogVisible.value = true
}

const handleCreateSession = async () => {
  if (!newSessionTitle.value.trim()) {
    ElMessage.warning('Please enter a session title')
    return
  }

  try {
    creating.value = true
    await createNewSession(newSessionTitle.value)
    createSessionDialogVisible.value = false
  } finally {
    creating.value = false
  }
}
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
          @click="openCreateDialog"
          class="flex items-center gap-2 h-10 px-4"
          :icon="PlusIcon"
        >
          <span>New Session</span>
        </el-button>

        <el-button
          type="success"
          @click="fetchSessions"
          :loading="loading"
          class="flex items-center gap-2 h-10 px-4"
          style="margin-left: 0"
          :icon="RefreshRightIcon"
        >
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
      <el-button
        type="primary"
        size="large"
        @click="openCreateDialog"
        class="px-8 py-4"
        :icon="PlusIcon"
      >
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

    <!-- Create Session Dialog -->
    <el-dialog
      v-model="createSessionDialogVisible"
      title="Create New Session"
      width="500px"
      align-center
    >
      <div class="py-4">
        <el-form @submit.prevent="handleCreateSession">
          <el-form-item label="Session Title" required>
            <el-input v-model="newSessionTitle" placeholder="e.g. Codeforces 1234A" autofocus />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createSessionDialogVisible = false">Cancel</el-button>
          <el-button type="primary" :loading="creating" @click="handleCreateSession">
            Create
          </el-button>
        </span>
      </template>
    </el-dialog>
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
