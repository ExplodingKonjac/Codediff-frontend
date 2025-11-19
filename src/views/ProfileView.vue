<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'
import {
  User as UserIcon,
  Key as KeyIcon,
  EditPen as EditPenIcon,
  Cpu as CpuIcon,
  Edit as EditIcon,
  Lock as LockIcon,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const profile = ref({
  username: '',
  email: '',
  ai_api_key: '',
  ai_api_url: '',
  ai_model: '', // 新增 AI 模型字段
})
const loading = ref(true)
const editing = ref(false)
const originalProfile = ref({})

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
    originalProfile.value = { ...profile.value }
  } catch (error) {
    ElMessage.error(`Failed to load profile: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  try {
    loading.value = true

    // 只发送变化的字段
    const updates = {}
    if (profile.value.username !== originalProfile.value.username)
      updates.username = profile.value.username
    if (profile.value.email !== originalProfile.value.email) updates.email = profile.value.email
    if (profile.value.ai_api_key !== originalProfile.value.ai_api_key)
      updates.ai_api_key = profile.value.ai_api_key
    if (profile.value.ai_api_url !== originalProfile.value.ai_api_url)
      updates.ai_api_url = profile.value.ai_api_url
    if (profile.value.ai_model !== originalProfile.value.ai_model)
      updates.ai_model = profile.value.ai_model

    if (Object.keys(updates).length === 0) {
      ElMessage.info('No changes to save')
      editing.value = false
      return
    }

    await updateUserProfile(updates)
    originalProfile.value = { ...profile.value }
    ElMessage.success('Profile updated successfully')
    editing.value = false
  } catch (error) {
    ElMessage.error(`Failed to update profile: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const resetProfile = () => {
  profile.value = { ...originalProfile.value }
  editing.value = false
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
      <el-button v-if="!editing" @click="editing = true" type="primary">
        <el-icon class="mr-1"><EditPenIcon /></el-icon>
        Edit Profile
      </el-button>
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
              <el-button
                v-if="editing"
                @click="editing = 'username'"
                size="small"
                class="mt-2 sm:mt-0"
              >
                <el-icon size="14" class="mr-1"><EditIcon /></el-icon>
                Change
              </el-button>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col">
                <span class="text-sm text-gray-500">Email</span>
                <span class="font-medium text-gray-800">{{ profile.email }}</span>
              </div>
              <el-button
                v-if="editing"
                @click="editing = 'email'"
                size="small"
                class="mt-2 sm:mt-0"
              >
                <el-icon size="14" class="mr-1"><EditIcon /></el-icon>
                Change
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
            <el-button v-if="editing" @click="editing = 'password'" size="small">
              <el-icon size="14" class="mr-1"><LockIcon /></el-icon>
              Change Password
            </el-button>
          </div>
        </div>

        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <el-icon class="text-blue-500"><CpuIcon /></el-icon>
            <span>AI Configuration</span>
          </h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 mb-1">AI API Key</label>
              <el-input
                v-model="profile.ai_api_key"
                :disabled="!editing"
                placeholder="Enter your AI API key"
                type="password"
                show-password
              />
            </div>

            <div>
              <label class="block text-sm text-gray-500 mb-1">AI API URL</label>
              <el-input
                v-model="profile.ai_api_url"
                :disabled="!editing"
                placeholder="Enter AI API endpoint URL"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-500 mb-1">AI Model</label>
              <el-input
                v-model="profile.ai_model"
                :disabled="!editing"
                placeholder="Enter your preferred AI model (e.g., gpt-4o)"
              />
            </div>
          </div>
        </div>

        <div v-if="editing" class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <el-button @click="resetProfile" :disabled="loading">Cancel</el-button>
          <el-button type="primary" @click="saveProfile" :loading="loading">Save Changes</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>
