<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { updateUserProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'
import {
  User as UserIcon,
  Message as MessageIcon,
  Check as CheckIcon,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
const emit = defineEmits(['refresh'])
const authStore = useAuthStore()

const showEmailDialog = ref(false)
const emailForm = ref({
  newEmail: '',
  verificationCode: '',
  password: '',
})
const countdown = ref(0)
let timer = null
const dialogLoading = ref(false)

const handleSendCode = async () => {
  if (!emailForm.value.newEmail) {
    ElMessage.warning(t('auth.enterEmailFirst'))
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.value.newEmail)) {
    ElMessage.warning(t('auth.enterValidEmail'))
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

const updateEmail = async () => {
  try {
    dialogLoading.value = true

    if (!emailForm.value.newEmail.trim()) {
      throw new Error(t('auth.emailEmpty'))
    }

    if (!emailForm.value.password.trim()) {
      throw new Error(t('profile.passwordRequiredForEmailChange'))
    }

    const updates = {
      email: emailForm.value.newEmail.trim(),
      verification_code: emailForm.value.verificationCode.trim(),
      password: emailForm.value.password.trim(),
    }

    await updateUserProfile(updates)
    ElMessage.success(t('profile.emailUpdated'))
    closeEmailDialog()
    emit('refresh')
  } catch (error) {
    ElMessage.error(`${t('profile.updateFailed')}: ${error.message}`)
  } finally {
    dialogLoading.value = false
  }
}

const closeEmailDialog = () => {
  showEmailDialog.value = false
  emailForm.value = { newEmail: props.profile.email, verificationCode: '', password: '' }
  if (timer) clearInterval(timer)
  countdown.value = 0
}

const openDialog = () => {
  emailForm.value.newEmail = props.profile.email || ''
  showEmailDialog.value = true
}
</script>

<template>
  <div class="mb-6 pb-4 border-b border-gray-200">
    <h2 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
      <el-icon class="text-blue-500"><UserIcon /></el-icon>
      <span>{{ t('profile.basicInfo') }}</span>
    </h2>

    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col">
          <span class="text-sm text-gray-500">{{ t('auth.username') }}</span>
          <span class="font-medium text-gray-800">{{ profile.username }}</span>
        </div>
        <span class="text-sm text-gray-400 italic mt-2 sm:mt-0">
          {{ t('profile.usernameCannotChanged') }}
        </span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col">
          <span class="text-sm text-gray-500">{{ t('auth.email') }}</span>
          <span class="font-medium text-gray-800">{{ profile.email }}</span>
        </div>
        <el-button @click="openDialog" type="warning" size="small" class="mt-2 sm:mt-0">
          <el-icon size="14" class="mr-1"><MessageIcon /></el-icon>
          {{ t('profile.changeEmail') }}
        </el-button>
      </div>
    </div>

    <!-- Email Dialog -->
    <el-dialog
      v-model="showEmailDialog"
      :title="t('profile.changeEmail')"
      width="500px"
      @close="closeEmailDialog"
      append-to-body
    >
      <el-form :model="emailForm" label-position="top" class="space-y-4">
        <el-form-item :label="t('profile.enterNewEmail')" prop="newEmail">
          <el-input
            v-model="emailForm.newEmail"
            :placeholder="t('profile.enterNewEmail')"
            type="email"
            required
          />
        </el-form-item>

        <el-form-item :label="t('profile.verificationCode')" prop="verificationCode">
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
              {{ countdown > 0 ? `${countdown}s` : t('profile.sendCode') }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="t('profile.currentPassword')" prop="password">
          <el-input
            v-model="emailForm.password"
            :placeholder="t('profile.currentPasswordPlaceholder')"
            type="password"
            show-password
            required
          />
          <p class="text-xs text-gray-400 mt-1">
            {{ t('profile.securityVerifyHint') }}
          </p>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer flex justify-end gap-3">
          <el-button @click="closeEmailDialog">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="updateEmail" :loading="dialogLoading">
            <el-icon class="mr-1"><CheckIcon /></el-icon>
            {{ t('profile.updateEmail') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
