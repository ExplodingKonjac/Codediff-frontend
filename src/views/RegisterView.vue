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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const formRef = ref(null) // 表单引用
const form = ref({
  username: '',
  email: '',
  verificationCode: '', // 新增字段
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const sendingCode = ref(false) // 发送验证码loading
const countdown = ref(0) // 倒计时

// 发送验证码
const handleSendCode = async () => {
  if (!form.value.email) {
    ElMessage.warning(t('auth.enterEmailFirst'))
    return
  }
  // 简单验证邮箱格式
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    ElMessage.warning(t('auth.enterValidEmail'))
    return
  }

  try {
    sendingCode.value = true
    const success = await authStore.sendVerificationCode(form.value.email)

    if (success) {
      // 开始倒计时
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      // 虽然 store 中已经有错误提示，但这能确保用户一定能看到反馈
      if (!document.querySelector('.el-message--error')) {
        ElMessage.error(t('auth.codeSendFailed'))
      }
    }
  } finally {
    sendingCode.value = false
  }
}

const rules = computed(() => ({
  username: [
    { required: true, message: t('auth.validation.usernameRequired'), trigger: 'blur' },
    {
      min: 3,
      max: 20,
      message: t('auth.validation.usernameLength'),
      trigger: 'blur',
    },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: t('auth.validation.usernamePattern'),
      trigger: 'blur',
    },
  ],
  email: [
    { required: true, message: t('auth.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.validation.emailInvalid'), trigger: 'blur' },
  ],
  verificationCode: [
    { required: true, message: t('auth.validation.codeRequired'), trigger: 'blur' },
    { len: 6, message: t('auth.validation.codeLength'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.validation.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('auth.validation.passwordLength'), trigger: 'blur' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
      message: t('auth.validation.passwordPattern'),
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: t('auth.validation.confirmPasswordRequired'), trigger: 'blur' },
    { validator: validatePasswordMatch, trigger: 'blur' },
  ],
}))

function validatePasswordMatch(rule, value, callback) {
  if (value !== form.value.password) {
    callback(new Error(t('auth.passwordMismatch')))
  } else {
    callback()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  // 表单验证
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  // 简单的前端验证
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning(t('auth.passwordMismatch'))
    return
  }

  try {
    loading.value = true

    const userData = {
      username: form.value.username.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
      verification_code: form.value.verificationCode.trim(), // 包含验证码
    }

    const success = await authStore.register(userData)

    if (success) {
      ElMessage.success(t('auth.registerSuccess'))
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    }
  } catch (error) {
    ElMessage.error(`${t('auth.registerFailed')}: ${error.message}`)
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
    percentage: strength * 25,
    color:
      strength <= 1
        ? '#f56c6c' // weak (red)
        : strength <= 2
          ? '#e6a23c' // medium (yellow)
          : strength <= 3
            ? '#409eff' // strong (blue)
            : '#67c23a', // very strong (green)
    text:
      strength <= 1
        ? t('common.weak')
        : strength <= 2
          ? t('common.medium')
          : strength <= 3
            ? t('common.strong')
            : t('common.veryStrong'),
  }
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-[var(--header-height)] -mt-[var(--header-height)] -mb-[calc(var(--header-height)/2)] pb-[calc(var(--header-height)/2)]"
  >
    <div class="w-full max-w-md">
      <div class="mb-6 flex items-center gap-3 cursor-pointer" @click="handleBack">
        <el-icon class="text-blue-600 text-xl"><ArrowLeftIcon /></el-icon>
        <div class="text-blue-600 font-medium">{{ t('auth.backToHome') }}</div>
      </div>

      <el-card class="border border-gray-200 shadow-lg">
        <div class="text-center mb-6">
          <img src="/logo.png" alt="CodeDiff Logo" class="h-16 w-auto mx-auto mb-4" />
          <h1 class="text-2xl font-bold text-gray-800">{{ t('auth.createAccount') }}</h1>
          <p class="text-gray-500 mt-1">{{ t('auth.joinSubtitle') }}</p>
        </div>

        <el-form
          ref="formRef"
          @submit.prevent="handleSubmit"
          :model="form"
          :rules="rules"
          label-position="top"
          class="space-y-4"
        >
          <el-form-item :label="t('auth.username')" prop="username">
            <el-input
              v-model="form.username"
              :placeholder="t('auth.chooseUsername')"
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
            <p class="text-xs text-gray-400 mt-1">{{ t('auth.usernameHint') }}</p>
          </el-form-item>

          <el-form-item :label="t('auth.email')" prop="email">
            <el-input
              v-model="form.email"
              :placeholder="t('auth.enterEmail')"
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

          <el-form-item :label="t('auth.verificationCode')" prop="verificationCode">
            <div class="flex gap-2 w-full">
              <el-input
                v-model="form.verificationCode"
                :placeholder="t('auth.enterCode')"
                size="large"
                class="flex-1"
                maxlength="6"
                @keyup.enter="handleSubmit"
              >
                <template #prefix>
                  <el-icon><KeyIcon /></el-icon>
                </template>
              </el-input>
              <el-button
                type="primary"
                size="large"
                :disabled="countdown > 0"
                :loading="sendingCode"
                @click="handleSendCode"
                class="w-32"
              >
                {{ countdown > 0 ? `${countdown}s` : t('auth.sendCode') }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item :label="t('auth.password')" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              :placeholder="t('auth.createStrongPassword')"
              size="large"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="handleSubmit"
            />
            <div v-if="form.password" class="mt-2 w-full">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ t('auth.passwordStrength') }}:</span>
                <span :class="strengthMeter.color" class="font-medium">{{
                  strengthMeter.text
                }}</span>
              </div>
              <el-progress
                :percentage="strengthMeter.percentage"
                :color="strengthMeter.color"
                :show-text="false"
                :stroke-width="10"
                class="w-full"
              />
              <p class="text-xs text-gray-400 mt-1">
                {{ t('auth.passwordHint') }}
              </p>
            </div>
          </el-form-item>

          <el-form-item :label="t('auth.confirmPassword')" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
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
                >{{ t('auth.agreeCheckbox') }}
                <el-link type="primary" :underline="false">{{ t('auth.terms') }}</el-link> &
                <el-link type="primary" :underline="false">{{ t('auth.privacy') }}</el-link></span
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
            {{ t('auth.createAccount') }}
          </el-button>

          <div class="text-center mt-4">
            <span class="text-gray-500">{{ t('auth.alreadyHaveAccount') }}</span>
            <el-link
              type="primary"
              :underline="false"
              class="ml-1 cursor-pointer"
              @click="handleLogin"
            >
              {{ t('auth.signIn') }}
            </el-link>
          </div>
        </el-form>
      </el-card>
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
