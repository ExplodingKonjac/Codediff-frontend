<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { register } from '@/api/auth'
import { ElMessage } from 'element-plus'
// 导入需要的图标
import {
  User as UserIcon,
  Message as MessageIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  ArrowLeftBold as ArrowLeftIcon,
  Check as CheckIcon,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const rules = {
  username: [
    { required: true, message: 'Username is required', trigger: 'blur' },
    { min: 3, max: 20, message: 'Username must be between 3 and 20 characters', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Username can only contain letters, numbers, and underscores',
      trigger: 'blur',
    },
  ],
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
      message: 'Password must contain at least one letter and one number',
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm your password', trigger: 'blur' },
    { validator: validatePasswordMatch, trigger: 'blur' },
  ],
}

function validatePasswordMatch(rule, value, callback) {
  if (value !== form.value.password) {
    callback(new Error('Passwords do not match'))
  } else {
    callback()
  }
}

const handleSubmit = async () => {
  // 简单的前端验证
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('Passwords do not match')
    return
  }

  try {
    loading.value = true

    const userData = {
      username: form.value.username.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
    }

    const success = await authStore.register(userData)

    if (success) {
      ElMessage.success('Registration successful! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    }
  } catch (error) {
    ElMessage.error(`Registration failed: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleLogin = () => {
  router.push('/login')
}

const handleBack = () => {
  router.push('/')
}

const strengthMeter = computed(() => {
  const password = form.value.password
  let strength = 0

  if (password.length >= 8) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^A-Za-z0-9]/.test(password)) strength += 1

  return {
    score: strength,
    color:
      strength <= 1
        ? 'bg-red-500'
        : strength <= 2
          ? 'bg-yellow-500'
          : strength <= 3
            ? 'bg-orange-500'
            : 'bg-green-500',
    text:
      strength <= 1 ? 'Weak' : strength <= 2 ? 'Medium' : strength <= 3 ? 'Strong' : 'Very Strong',
  }
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4"
  >
    <div class="w-full max-w-md">
      <div class="mb-6 flex items-center gap-3 cursor-pointer" @click="handleBack">
        <el-icon class="text-blue-600 text-xl"><ArrowLeftIcon /></el-icon>
        <div class="text-blue-600 font-medium">Back to Home</div>
      </div>

      <el-card class="border border-gray-200 shadow-lg">
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">⚡</div>
          <h1 class="text-2xl font-bold text-gray-800">Create Account</h1>
          <p class="text-gray-500 mt-1">Join CodeDiff and start verifying your code</p>
        </div>

        <el-form
          @submit.prevent="handleSubmit"
          :model="form"
          :rules="rules"
          label-position="top"
          class="space-y-4"
        >
          <el-form-item label="Username" prop="username">
            <el-input
              v-model="form.username"
              placeholder="Choose a username (3-20 characters)"
              size="large"
              :prefix-icon="UserIcon"
              @keyup.enter="handleSubmit"
            >
              <template #suffix>
                <el-icon v-if="form.username && form.username.length >= 3" class="text-green-500">
                  <CheckIcon />
                </el-icon>
              </template>
            </el-input>
            <p class="text-xs text-gray-400 mt-1">Only letters, numbers, and underscores allowed</p>
          </el-form-item>

          <el-form-item label="Email" prop="email">
            <el-input
              v-model="form.email"
              placeholder="Enter your email address"
              size="large"
              :prefix-icon="MessageIcon"
              @keyup.enter="handleSubmit"
            >
              <template #suffix>
                <el-icon
                  v-if="form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)"
                  class="text-green-500"
                >
                  <CheckIcon />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="Password" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="Create a strong password"
              size="large"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="handleSubmit"
            />
            <div v-if="form.password" class="mt-2">
              <div class="flex justify-between text-xs mb-1">
                <span>Password Strength:</span>
                <span :class="strengthMeter.color" class="font-medium">{{
                  strengthMeter.text
                }}</span>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="strengthMeter.color"
                  :style="{ width: strengthMeter.score * 25 + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Must contain at least 6 characters, including letters and numbers
              </p>
            </div>
          </el-form-item>

          <el-form-item label="Confirm Password" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="Confirm your password"
              size="large"
              :prefix-icon="KeyIcon"
              show-password
              @keyup.enter="handleSubmit"
            >
              <template #suffix>
                <el-icon
                  v-if="form.confirmPassword && form.confirmPassword === form.password"
                  class="text-green-500"
                >
                  <CheckIcon />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>

          <div class="mb-6">
            <el-checkbox checked disabled>
              <span class="text-gray-600"
                >I agree to the
                <el-link type="primary" :underline="false">Terms of Service</el-link> and
                <el-link type="primary" :underline="false">Privacy Policy</el-link></span
              >
            </el-checkbox>
          </div>

          <el-button
            type="primary"
            size="large"
            class="w-full"
            @click="handleSubmit"
            :loading="loading"
          >
            Create Account
          </el-button>

          <div class="text-center mt-4">
            <span class="text-gray-500">Already have an account?</span>
            <el-link
              type="primary"
              :underline="false"
              class="ml-1 cursor-pointer"
              @click="handleLogin"
            >
              Sign in
            </el-link>
          </div>
        </el-form>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-center text-sm text-gray-500">
            This is a demo application for educational purposes. No real data is stored permanently.
          </p>
        </div>
      </el-card>

      <div class="mt-8 text-center text-sm text-gray-400">
        <p>CodeDiff © {{ new Date().getFullYear() }} - Program Verification Assistant</p>
        <p class="mt-1">Designed for freshman programming course debugging</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.el-card {
  transition: all 0.3s ease;
}

.el-card:hover {
  box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.3) !important;
}

:deep(.el-input__suffix) {
  margin-right: 8px;
}

:deep(.el-checkbox__label) {
  line-height: 1.5;
}

.password-strength {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  transition: width 0.3s ease;
}
</style>
