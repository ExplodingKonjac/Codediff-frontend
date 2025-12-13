<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/api/auth'
import {
  User as UserIcon,
  Lock as LockIcon,
  ArrowLeftBold as ArrowLeftBoldIcon,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const router = useRouter()
const identifier = ref('')
const password = ref('')
const loading = ref(false)
const rememberMe = ref(true)

const handleSubmit = async () => {
  if (!identifier.value.trim() || !password.value.trim()) {
    ElMessage.warning('Please enter both username/email and password')
    return
  }

  try {
    loading.value = true

    const credentials = {
      identifier: identifier.value.trim(),
      password: password.value,
    }

    const success = await authStore.login(credentials)

    if (success) {
      // 保存记住我选项
      if (rememberMe.value) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberMe')
      }

      // 重定向
      const redirectPath = router.currentRoute.value.query.redirect || '/'
      router.push(redirectPath)
    }
  } catch (error) {
    ElMessage.error(`Login failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleRegister = () => {
  router.push('/register')
}

const handleBack = () => {
  router.push('/')
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-[var(--header-height)] -mt-[var(--header-height)]"
  >
    <div class="w-full max-w-md">
      <div class="mb-6 flex items-center gap-3 cursor-pointer" @click="handleBack">
        <el-icon class="text-blue-600 text-xl"><ArrowLeftBoldIcon /></el-icon>
        <div class="text-blue-600 font-medium">Back to Home</div>
      </div>

      <el-card class="border border-gray-200 shadow-lg">
        <div class="text-center mb-6">
          <img src="/logo.png" alt="CodeDiff Logo" class="h-16 w-auto mx-auto mb-4" />
          <h1 class="text-2xl font-bold text-gray-800">Welcome to CodeDiff</h1>
          <p class="text-gray-500 mt-1">Verify your code with ease</p>
        </div>

        <el-form @submit.prevent="handleSubmit" label-position="top" class="space-y-4">
          <el-form-item label="Username or Email">
            <el-input
              v-model="identifier"
              placeholder="Enter your username or email"
              size="large"
              :prefix-icon="UserIcon"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <el-form-item label="Password">
            <el-input
              v-model="password"
              type="password"
              placeholder="Enter your password"
              size="large"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <div class="flex items-center justify-between mb-6">
            <el-checkbox v-model="rememberMe">Remember me</el-checkbox>
            <el-link type="primary" :underline="false">Forgot password?</el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="w-full"
            @click="handleSubmit"
            :loading="loading"
          >
            Sign In
          </el-button>

          <div class="text-center mt-4">
            <span class="text-gray-500">Don't have an account?</span>
            <el-link
              type="primary"
              :underline="false"
              class="ml-1 cursor-pointer"
              @click="handleRegister"
            >
              Sign up
            </el-link>
          </div>
        </el-form>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-center text-sm text-gray-500">
            By signing in, you agree to our
            <el-link type="primary" :underline="false">Terms of Service</el-link>
            and
            <el-link type="primary" :underline="false">Privacy Policy</el-link>
          </p>
        </div>
      </el-card>
    </div>
  </div>
</template>
