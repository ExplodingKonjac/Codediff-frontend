<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
// 正确导入图标
import {
  User as UserIcon,
  SwitchButton as SwitchButtonIcon,
  Setting as SettingIcon,
  Plus as PlusIcon,
  ArrowDownBold as ArrowDownBoldIcon,
  UserFilled as UserFilledIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwitchButton as LogoutIcon,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const showProfileMenu = ref(false)
const dropdownVisible = ref(false)

const username = computed(() => authStore.username)

const handleLogout = async () => {
  ElMessageBox.confirm('Are you sure you want to log out?', 'Confirm Logout', {
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    type: 'warning',
  })
    .then(() => {
      authStore.logout()
      router.push('/login')
    })
    .catch((reason) => {
      ElMessage.info(`Logout canceled: ${reason}`)
    })
}

const handleProfile = () => {
  router.push('/profile')
  dropdownVisible.value = false
}

const handleNewSession = () => {
  router.push('/')
  dropdownVisible.value = false
  window.dispatchEvent(new CustomEvent('create-session'))
}
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg h-[var(--header-height)]"
  >
    <div class="container mx-auto px-4 h-full flex items-center justify-between">
      <!-- 左侧: Logo + Title -->
      <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/')">
        <div class="text-white text-3xl font-bold flex items-center gap-2">
          <span class="text-4xl">⚡</span>
          <span class="text-2xl font-extrabold tracking-wider">CodeDiff</span>
        </div>
      </div>

      <!-- 右侧: 用户信息 -->
      <div class="flex items-center gap-3">
        <!-- Auth Buttons (未登录) -->
        <div v-if="!authStore.isAuthenticated" class="flex items-center gap-3">
          <el-button
            type="primary"
            @click="router.push('/register')"
            class="bg-white text-blue-600 hover:bg-blue-50 transition-all font-medium"
          >
            Register
          </el-button>
          <el-button
            type="success"
            @click="router.push('/login')"
            class="bg-white text-green-600 hover:bg-green-50 transition-all font-medium"
          >
            Login
          </el-button>
        </div>

        <!-- User Menu (已登录) -->
        <div v-else class="relative">
          <div
            class="flex items-center gap-3 cursor-pointer p-2 rounded-full hover:bg-white/20 transition-colors"
            @click="dropdownVisible = !dropdownVisible"
          >
            <el-avatar :size="40" class="bg-blue-200 text-blue-800 font-medium">
              {{ username.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="text-white font-bold text-lg hidden md:inline">{{ username }}</span>
            <el-icon class="text-white text-sm"><ArrowDownBoldIcon /></el-icon>
          </div>

          <transition name="fade">
            <div
              v-show="dropdownVisible"
              class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-10 border border-gray-100"
              @click.outside="dropdownVisible = false"
            >
              <div
                class="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer"
                @click="handleProfile"
              >
                <el-icon class="text-blue-500 text-lg"><UserFilledIcon /></el-icon>
                <span>Profile</span>
              </div>

              <div class="border-t border-gray-100 my-1"></div>

              <div
                class="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                @click="handleLogout"
              >
                <el-icon class="text-lg"><LogoutIcon /></el-icon>
                <span>Logout</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 添加动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.pulse {
  animation: pulse 2s infinite;
}
</style>
