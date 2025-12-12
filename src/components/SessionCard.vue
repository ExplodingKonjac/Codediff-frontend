<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateSession, deleteSession } from '@/api/sessions'
import { formatDate } from '@/utils/date'
// 使用正确的图标导入
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowRightBold as ArrowRightBoldIcon,
} from '@element-plus/icons-vue'

const props = defineProps({
  session: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['title-updated', 'session-deleted'])

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)

const successRateColor = computed(() => {
  const rate = props.session.success_rate || 0
  if (rate >= 80) return 'text-green-500'
  if (rate >= 50) return 'text-yellow-500'
  return 'text-red-500'
})

const handleDetail = () => {
  router.push(`/sessions/${props.session.id}`)
}

const handleEditTitle = async (event) => {
  event.stopPropagation()
  ElMessageBox.prompt('Enter new title:', 'Edit Session Title', {
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    inputValue: props.session.title,
    inputErrorMessage: 'Title cannot be empty',
  })
    .then(async ({ value }) => {
      if (value.trim() === '') {
        throw new Error('Title cannot be empty')
      }

      const newTitle = value.trim()
      if (newTitle === props.session.title) {
        return
      }

      try {
        // 修复：只更新标题字段
        const updateData = {
          title: newTitle,
        }

        await updateSession(props.session.id, updateData)

        // 更新本地数据
        props.session.title = newTitle
        ElMessage.success('Title updated successfully')

        // 触发事件通知父组件
        emit('title-updated', { id: props.session.id, title: newTitle })
      } catch (error) {
        ElMessage.error(`Failed to update title: ${error.message}`)
      }
    })
    .catch(() => {
      ElMessage.info('Edit canceled')
    })
}

const handleDelete = async (event) => {
  event.stopPropagation()
  ElMessageBox.confirm(
    'Are you sure you want to delete this session? All data will be permanently lost.',
    'Confirm Deletion',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        // 修复：调用 API 删除会话
        await deleteSession(props.session.id)

        ElMessage.success('Session deleted successfully')
        // 修复：通过 emit 通知父组件而不是 window 事件
        emit('session-deleted', { id: props.session.id })
      } catch (error) {
        ElMessage.error(`Failed to delete session: ${error.message}`)
      }
    })
    .catch(() => {
      ElMessage.info('Deletion canceled')
    })
}
</script>

<template>
  <!-- 确保背景为白色，添加内边距 -->
  <div
    class="relative group bg-white rounded-xl shadow-card hover:shadow-card-hover border border-gray-200 overflow-hidden cursor-pointer transition-all duration-300"
    @click="handleDetail"
  >
    <!-- 关键修正：添加内边距 p-6，并确保背景为白色 -->
    <div class="p-6">
      <!-- 标题和操作按钮行 -->
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-gray-800">{{ session.title }}</h3>
        <div class="flex gap-2">
          <el-button
            type="warning"
            size="small"
            circle
            @click.stop="handleEditTitle"
            class="hover:bg-yellow-100 transition-colors"
            title="Edit title"
          >
            <el-icon size="16"><EditIcon /></el-icon>
          </el-button>
          <el-button
            type="danger"
            size="small"
            circle
            @click.stop="handleDelete"
            class="hover:bg-red-100 transition-colors"
            title="Delete session"
          >
            <el-icon size="16"><DeleteIcon /></el-icon>
          </el-button>
        </div>
      </div>

      <p class="text-gray-600 mb-5 line-clamp-2 min-h-[3.5rem]">
        {{ session.description || 'No description provided' }}
      </p>

      <div class="flex flex-wrap gap-2 mb-5">
        <el-tag type="info" size="small" class="font-medium">
          {{ session.test_case_count || 0 }} test{{ session.test_case_count > 1 ? 's' : '' }}
        </el-tag>
      </div>

      <div class="flex justify-between items-center pt-4 border-t border-gray-200">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <el-avatar :size="24" class="bg-blue-100 text-blue-600 font-medium text-sm">
              {{ authStore.username.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="text-sm font-medium text-gray-700">{{ authStore.username }}</span>
          </div>

          <span class="text-sm text-gray-500">•</span>
          <span class="text-sm text-gray-500">{{ formatDate(session.created_at) }}</span>
        </div>

        <!-- <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Success:</span>
          <span :class="`font-bold text-lg ${successRateColor}`">
            {{ session.success_rate }}%
          </span>
        </div> -->
      </div>
    </div>

    <!-- 底部装饰条，增强视觉层次 -->
    <div class="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
  </div>
</template>

<style scoped>
/* 卡片悬停效果 */
.shadow-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.shadow-card-hover {
  box-shadow: 0 8px 25px rgba(2, 132, 199, 0.3);
  transform: translateY(-2px);
}

/* 确保白底不透明 */
.bg-white {
  background-color: white !important;
}

/* 内容溢出处理 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡片过渡效果 */
.transition-all {
  transition: all 0.3s ease;
}

/* 按钮悬停效果增强 */
.hover\:bg-yellow-100:hover {
  background-color: #fef3c7;
}

.hover\:bg-red-100:hover {
  background-color: #fee2e2;
}
</style>
