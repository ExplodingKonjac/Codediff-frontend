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
    ElMessage.warning('Please enter new email address first')
    return
  }

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

const updateEmail = async () => {
  try {
    dialogLoading.value = true

    if (!emailForm.value.newEmail.trim()) {
      throw new Error('Email cannot be empty')
    }

    if (!emailForm.value.password.trim()) {
      throw new Error('Password is required for email change')
    }

    const updates = {
      email: emailForm.value.newEmail.trim(),
      verification_code: emailForm.value.verificationCode.trim(),
      password: emailForm.value.password.trim(),
    }

    await updateUserProfile(updates)
    ElMessage.success('Email updated successfully')
    closeEmailDialog()
    emit('refresh')
  } catch (error) {
    ElMessage.error(`Failed to update email: ${error.message}`)
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
      <span>Basic Information</span>
    </h2>

    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col">
          <span class="text-sm text-gray-500">Username</span>
          <span class="font-medium text-gray-800">{{ profile.username }}</span>
        </div>
        <span class="text-sm text-gray-400 italic mt-2 sm:mt-0"> Username cannot be changed </span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col">
          <span class="text-sm text-gray-500">Email</span>
          <span class="font-medium text-gray-800">{{ profile.email }}</span>
        </div>
        <el-button @click="openDialog" type="warning" size="small" class="mt-2 sm:mt-0">
          <el-icon size="14" class="mr-1"><MessageIcon /></el-icon>
          Change Email
        </el-button>
      </div>
    </div>

    <!-- Email Dialog -->
    <el-dialog
      v-model="showEmailDialog"
      title="Change Email Address"
      width="500px"
      @close="closeEmailDialog"
      append-to-body
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
          <el-button type="primary" @click="updateEmail" :loading="dialogLoading">
            <el-icon class="mr-1"><CheckIcon /></el-icon>
            Update Email
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
