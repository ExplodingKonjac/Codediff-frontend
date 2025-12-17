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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const identifier = ref('')
const password = ref('')
const loading = ref(false)
const rememberMe = ref(true)

const handleSubmit = async () => {
  if (!identifier.value.trim() || !password.value.trim()) {
    ElMessage.warning(t('auth.enterBothCredentials'))
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
    ElMessage.error(`${t('auth.loginFailed')}: ${error.message}`)
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
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-[var(--header-height)] -mt-[var(--header-height)] -mb-[calc(var(--header-height)/2)] pb-[calc(var(--header-height)/2)]"
  >
    <div class="w-full max-w-md">
      <div class="mb-6 flex items-center gap-3 cursor-pointer" @click="handleBack">
        <el-icon class="text-blue-600 text-xl"><ArrowLeftBoldIcon /></el-icon>
        <div class="text-blue-600 font-medium">{{ t('auth.backToHome') }}</div>
      </div>

      <el-card class="border border-gray-200 shadow-lg">
        <div class="text-center mb-6">
          <img src="/logo.png" alt="CodeDiff Logo" class="h-16 w-auto mx-auto mb-4" />
          <h1 class="text-2xl font-bold text-gray-800">{{ t('auth.welcomeTitle') }}</h1>
          <p class="text-gray-500 mt-1">{{ t('auth.welcomeSubtitle') }}</p>
        </div>

        <el-form @submit.prevent="handleSubmit" label-position="top" class="space-y-4">
          <el-form-item :label="t('auth.usernameOrEmail')">
            <el-input
              v-model="identifier"
              :placeholder="t('auth.enterUsernameOrEmail')"
              size="large"
              :prefix-icon="UserIcon"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <el-form-item :label="t('auth.password')">
            <el-input
              v-model="password"
              type="password"
              :placeholder="t('auth.enterPassword')"
              size="large"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <div class="flex items-center justify-between mb-6">
            <el-checkbox v-model="rememberMe">{{ t('auth.rememberMe') }}</el-checkbox>
            <el-link type="primary" :underline="false">{{ t('auth.forgotPassword') }}</el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="w-full"
            @click="handleSubmit"
            :loading="loading"
          >
            {{ t('auth.signIn') }}
          </el-button>

          <div class="text-center mt-4">
            <span class="text-gray-500">{{ t('auth.noAccount') }}</span>
            <el-link
              type="primary"
              :underline="false"
              class="ml-1 cursor-pointer"
              @click="handleRegister"
            >
              {{ t('auth.signUp') }}
            </el-link>
          </div>
        </el-form>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-center text-sm text-gray-500">
            {{ t('auth.agreeTo') }}
            <el-link type="primary" :underline="false">{{ t('auth.terms') }}</el-link>
            &
            <el-link type="primary" :underline="false">{{ t('auth.privacy') }}</el-link>
          </p>
        </div>
      </el-card>
    </div>
  </div>
</template>
