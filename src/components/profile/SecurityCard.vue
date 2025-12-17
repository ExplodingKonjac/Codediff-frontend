<script setup>
import { ref } from 'vue'
import { updateUserProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'
import { Key as KeyIcon, Lock as LockIcon, Check as CheckIcon } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits(['refresh'])

const showPasswordDialog = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const dialogLoading = ref(false)

const updatePassword = async () => {
  try {
    dialogLoading.value = true

    if (!passwordForm.value.currentPassword.trim()) {
      throw new Error(t('auth.passwordEmpty'))
    }

    if (!passwordForm.value.newPassword.trim()) {
      throw new Error(t('auth.newPasswordEmpty'))
    }

    if (passwordForm.value.newPassword.length < 6) {
      throw new Error(t('auth.newPasswordShort'))
    }

    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      throw new Error(t('auth.newPasswordMismatch'))
    }

    const updates = {
      password: passwordForm.value.currentPassword.trim(),
      new_password: passwordForm.value.newPassword.trim(),
    }

    await updateUserProfile(updates)
    ElMessage.success(t('profile.passwordUpdated'))
    closePasswordDialog()
    emit('refresh')
  } catch (error) {
    ElMessage.error(`${t('profile.updateFailed')}: ${error.message}`)
  } finally {
    dialogLoading.value = false
  }
}

const closePasswordDialog = () => {
  showPasswordDialog.value = false
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
}
</script>

<template>
  <div class="mb-6 pb-4 border-b border-gray-200">
    <h2 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
      <el-icon class="text-blue-500"><KeyIcon /></el-icon>
      <span>{{ t('profile.password') }}</span>
    </h2>

    <div class="flex items-center justify-between">
      <span class="text-gray-500">********</span>
      <el-button @click="showPasswordDialog = true" type="danger" size="small">
        <el-icon size="14" class="mr-1"><LockIcon /></el-icon>
        {{ t('profile.changePassword') }}
      </el-button>
    </div>

    <!-- Password Dialog -->
    <el-dialog
      v-model="showPasswordDialog"
      :title="t('profile.changePassword')"
      width="500px"
      @close="closePasswordDialog"
      append-to-body
    >
      <el-form :model="passwordForm" label-position="top" class="space-y-4">
        <el-form-item :label="t('profile.currentPassword')" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            :placeholder="t('profile.currentPasswordPlaceholder')"
            type="password"
            show-password
            required
          />
        </el-form-item>

        <el-form-item :label="t('profile.newPassword')" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            :placeholder="t('profile.newPasswordPlaceholder')"
            type="password"
            show-password
            required
          />
          <p class="text-xs text-gray-400 mt-1">
            {{ t('profile.newPasswordHint') }}
          </p>
        </el-form-item>

        <el-form-item :label="t('profile.confirmNewPassword')" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            :placeholder="t('profile.confirmNewPasswordPlaceholder')"
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
                ? t('profile.passwordsMatch')
                : t('profile.passwordsDoNotMatch')
            }}
          </p>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer flex justify-end gap-3">
          <el-button @click="closePasswordDialog">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="updatePassword" :loading="dialogLoading">
            <el-icon class="mr-1"><CheckIcon /></el-icon>
            {{ t('profile.updatePassword') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
