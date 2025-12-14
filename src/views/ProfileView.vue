<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/api/auth'
import { ElMessage, ElMessageBox, ElDialog } from 'element-plus'
import {
  User as UserIcon,
  Key as KeyIcon,
  Cpu as CpuIcon,
  Lock as LockIcon,
  Message as MessageIcon, // 替换 Email 图标
  Close as CloseIcon,
  Check as CheckIcon,
  EditPen as EditPenIcon,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const profile = ref({
  username: '',
  email: '',
  ai_api_key: '',
  ai_api_url: '',
  ai_model: '',
})
const loading = ref(true)

// ===== 新增：对话框状态 =====
const showEmailDialog = ref(false)
const showPasswordDialog = ref(false)
const showAIDialog = ref(false)

// ===== 新增：对话框数据 =====
const emailForm = ref({
  newEmail: '',
  verificationCode: '',
  password: '',
})

// 验证码倒计时
const countdown = ref(0)
let timer = null

const handleSendCode = async () => {
  if (!emailForm.value.newEmail) {
    ElMessage.warning('Please enter new email address first')
    return
  }

  // 简单验证邮箱格式
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.value.newEmail)) {
    ElMessage.warning('Please enter a valid email address')
    return
  }

  const success = await authStore.sendVerificationCode(emailForm.value.newEmail)
  if (success) {
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }
}

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const aiForm = ref({
  ai_api_key: '',
  ai_api_url: '',
  ai_model: '',
})

const fetchProfile = async () => {
  try {
    loading.value = true
    const response = await getUserProfile()
    profile.value = {
      username: response.data.username,
      email: response.data.email,
      ai_api_key: response.data.ai_api_key || '',
      ai_api_url: response.data.ai_api_url || '',
      ai_model: response.data.ai_model || '',
    }
  } catch (error) {
    ElMessage.error(`Failed to load profile: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ===== 新增：邮箱修改处理 =====
const updateEmail = async () => {
  try {
    loading.value = true

    // 验证
    if (!emailForm.value.newEmail.trim()) {
      throw new Error('Email cannot be empty')
    }

    if (!emailForm.value.password.trim()) {
      throw new Error('Password is required for email change')
    }

    // 更新邮箱
    const updates = {
      email: emailForm.value.newEmail.trim(),
      verification_code: emailForm.value.verificationCode.trim(),
      password: emailForm.value.password.trim(),
    }

    await updateUserProfile(updates)

    // 更新本地数据
    profile.value.email = emailForm.value.newEmail.trim()

    ElMessage.success('Email updated successfully')
    showEmailDialog.value = false
    showEmailDialog.value = false
    emailForm.value = { newEmail: '', verificationCode: '', password: '' }
    clearInterval(timer)
    countdown.value = 0
  } catch (error) {
    ElMessage.error(`Failed to update email: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ===== 新增：密码修改处理 =====
const updatePassword = async () => {
  try {
    loading.value = true

    // 验证
    if (!passwordForm.value.currentPassword.trim()) {
      throw new Error('Current password is required')
    }

    if (!passwordForm.value.newPassword.trim()) {
      throw new Error('New password cannot be empty')
    }

    if (passwordForm.value.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters')
    }

    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      throw new Error('New passwords do not match')
    }

    // 更新密码
    const updates = {
      password: passwordForm.value.currentPassword.trim(),
      new_password: passwordForm.value.newPassword.trim(),
    }

    await updateUserProfile(updates)

    ElMessage.success('Password updated successfully')
    showPasswordDialog.value = false
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    ElMessage.error(`Failed to update password: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ===== 新增：AI 配置修改处理 =====
const updateAIConfig = async () => {
  try {
    loading.value = true

    // 更新 AI 配置
    const updates = {
      ai_api_key: aiForm.value.ai_api_key.trim(),
      ai_api_url: aiForm.value.ai_api_url.trim(),
      ai_model: aiForm.value.ai_model.trim(),
    }

    await updateUserProfile(updates)

    // 更新本地数据
    profile.value.ai_api_key = aiForm.value.ai_api_key.trim()
    profile.value.ai_api_url = aiForm.value.ai_api_url.trim()
    profile.value.ai_model = aiForm.value.ai_model.trim()

    ElMessage.success('AI configuration updated successfully')
    showAIDialog.value = false
  } catch (error) {
    ElMessage.error(`Failed to update AI configuration: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ===== 新增：对话框关闭处理 =====
const closeEmailDialog = () => {
  showEmailDialog.value = false
  emailForm.value = { newEmail: profile.value.email, verificationCode: '', password: '' }
  clearInterval(timer)
  countdown.value = 0
}

const closePasswordDialog = () => {
  showPasswordDialog.value = false
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
}

const closeAIDialog = () => {
  showAIDialog.value = false
  aiForm.value = {
    ai_api_key: profile.value.ai_api_key,
    ai_api_url: profile.value.ai_api_url,
    ai_model: profile.value.ai_model,
  }
}

const openAIDialog = () => {
  aiForm.value = {
    ai_api_key: profile.value.ai_api_key,
    ai_api_url: profile.value.ai_api_url,
    ai_model: profile.value.ai_model,
  }
  showAIDialog.value = true
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <el-icon class="text-blue-500 text-2xl"><UserIcon /></el-icon>
        <span>User Profile</span>
      </h1>
      <!-- 右上角按钮已移除 -->
    </div>

    <el-card class="border border-gray-200 shadow-card">
      <div v-if="loading" class="flex justify-center items-center h-48">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else>
        <div class="mb-6 pb-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <el-icon class="text-blue-500"><UserIcon /></el-icon>
            <span>Basic Information</span>
          </h2>

          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col">
                <span class="text-sm text-gray-500">Username</span>
                <span class="font-medium text-gray-800">{{ profile.username }}</span>
              </div>
              <span class="text-sm text-gray-400 italic mt-2 sm:mt-0"
                >Username cannot be changed</span
              >
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col">
                <span class="text-sm text-gray-500">Email</span>
                <span class="font-medium text-gray-800">{{ profile.email }}</span>
              </div>
              <el-button
                @click="showEmailDialog = true"
                type="warning"
                size="small"
                class="mt-2 sm:mt-0"
              >
                <el-icon size="14" class="mr-1"><MessageIcon /></el-icon>
                Change Email
              </el-button>
            </div>
          </div>
        </div>

        <div class="mb-6 pb-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <el-icon class="text-blue-500"><KeyIcon /></el-icon>
            <span>Password</span>
          </h2>

          <div class="flex items-center justify-between">
            <span class="text-gray-500">********</span>
            <el-button @click="showPasswordDialog = true" type="danger" size="small">
              <el-icon size="14" class="mr-1"><LockIcon /></el-icon>
              Change Password
            </el-button>
          </div>
        </div>

        <!-- ===== 重构：AI Configuration ===== -->
        <div class="mb-6 pb-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <el-icon class="text-blue-500"><CpuIcon /></el-icon>
              <span>AI Configuration</span>
            </h2>
            <el-button type="warning" size="small" @click="openAIDialog" class="mt-2 sm:mt-0">
              <el-icon size="14" class="mr-1"><EditPenIcon /></el-icon>
              Change Configuration
            </el-button>
          </div>

          <div class="space-y-3">
            <div class="flex flex-col">
              <span class="text-sm text-gray-500">API Key</span>
              <span class="font-medium text-gray-800">••••••••••••••••</span>
            </div>

            <div class="flex flex-col">
              <span class="text-sm text-gray-500">API URL</span>
              <span class="font-medium text-gray-800 truncate max-w-xs">{{
                profile.ai_api_url || 'Not set'
              }}</span>
            </div>

            <div class="flex flex-col">
              <span class="text-sm text-gray-500">Model</span>
              <span class="font-medium text-gray-800">{{ profile.ai_model || 'Default' }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>

  <!-- ===== 邮箱修改对话框 ===== -->
  <el-dialog
    v-model="showEmailDialog"
    title="Change Email Address"
    width="500px"
    @close="closeEmailDialog"
  >
    <el-form :model="emailForm" label-position="top" class="space-y-4">
      <el-form-item label="New Email Address" prop="newEmail">
        <el-input
          v-model="emailForm.newEmail"
          placeholder="Enter your new email address"
          type="email"
          required
        />
      </el-form-item>

      <el-form-item label="Verification Code" prop="verificationCode">
        <div class="flex gap-2 w-full">
          <el-input
            v-model="emailForm.verificationCode"
            placeholder="6-digit code"
            maxlength="6"
            class="flex-1"
          />
          <el-button
            type="primary"
            :disabled="countdown > 0 || !emailForm.newEmail"
            @click="handleSendCode"
            class="w-32"
          >
            {{ countdown > 0 ? `${countdown}s` : 'Send Code' }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="Current Password" prop="password">
        <el-input
          v-model="emailForm.password"
          placeholder="Enter your current password to confirm"
          type="password"
          show-password
          required
        />
        <p class="text-xs text-gray-400 mt-1">
          For security purposes, we need to verify your identity before changing your email.
        </p>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer flex justify-end gap-3">
        <el-button @click="closeEmailDialog">Cancel</el-button>
        <el-button type="primary" @click="updateEmail" :loading="loading">
          <el-icon class="mr-1"><CheckIcon /></el-icon>
          Update Email
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ===== 密码修改对话框 ===== -->
  <el-dialog
    v-model="showPasswordDialog"
    title="Change Password"
    width="500px"
    @close="closePasswordDialog"
  >
    <el-form :model="passwordForm" label-position="top" class="space-y-4">
      <el-form-item label="Current Password" prop="currentPassword">
        <el-input
          v-model="passwordForm.currentPassword"
          placeholder="Enter your current password"
          type="password"
          show-password
          required
        />
      </el-form-item>

      <el-form-item label="New Password" prop="newPassword">
        <el-input
          v-model="passwordForm.newPassword"
          placeholder="Enter your new password (at least 6 characters)"
          type="password"
          show-password
          required
        />
        <p class="text-xs text-gray-400 mt-1">
          Password must contain at least 6 characters including letters and numbers
        </p>
      </el-form-item>

      <el-form-item label="Confirm New Password" prop="confirmPassword">
        <el-input
          v-model="passwordForm.confirmPassword"
          placeholder="Confirm your new password"
          type="password"
          show-password
          required
        />
        <p
          v-if="passwordForm.newPassword && passwordForm.confirmPassword"
          class="text-xs mt-1"
          :class="
            passwordForm.newPassword === passwordForm.confirmPassword
              ? 'text-green-500'
              : 'text-red-500'
          "
        >
          {{
            passwordForm.newPassword === passwordForm.confirmPassword
              ? 'Passwords match'
              : 'Passwords do not match'
          }}
        </p>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer flex justify-end gap-3">
        <el-button @click="closePasswordDialog">Cancel</el-button>
        <el-button type="primary" @click="updatePassword" :loading="loading">
          <el-icon class="mr-1"><CheckIcon /></el-icon>
          Update Password
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ===== AI Configuration 对话框 ===== -->
  <el-dialog
    v-model="showAIDialog"
    title="Update AI Configuration"
    width="500px"
    @close="closeAIDialog"
  >
    <el-form :model="aiForm" label-position="top" class="space-y-4">
      <el-form-item label="AI API Key" prop="ai_api_key">
        <el-input
          v-model="aiForm.ai_api_key"
          placeholder="Enter your AI API key"
          type="password"
          show-password
        />
        <p class="text-xs text-gray-400 mt-1">
          Your API key for the AI service (e.g., OpenAI, Claude, etc.)
        </p>
      </el-form-item>

      <el-form-item label="AI API URL" prop="ai_api_url">
        <el-input
          v-model="aiForm.ai_api_url"
          placeholder="https://api.example.com/v1/"
          type="url"
        />
        <p class="text-xs text-gray-400 mt-1">Example: https://api.openai.com/v1/</p>
      </el-form-item>

      <el-form-item label="AI Model" prop="ai_model">
        <el-input v-model="aiForm.ai_model" placeholder="gpt-4o, claude-3-sonnet, gemini-1.5-pro" />
        <p class="text-xs text-gray-400 mt-1">Example: gpt-4o, gpt-3.5-turbo, claude-3-sonnet</p>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer flex justify-end gap-3">
        <el-button @click="closeAIDialog">Cancel</el-button>
        <el-button type="primary" @click="updateAIConfig" :loading="loading">
          <el-icon class="mr-1"><CheckIcon /></el-icon>
          Save Configuration
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.container {
  margin: 0 auto;
  max-width: 1440px;
  padding: 0 2rem;
}

/* 对话框样式优化 */
:deep(.el-dialog__header) {
  padding: 20px 20px 0;
}

:deep(.el-dialog__body) {
  padding: 15px 20px 0;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
  }

  .container {
    padding: 0 1rem;
  }
}
</style>
