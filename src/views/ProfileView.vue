<script setup>
import { ref, onMounted } from 'vue'
import { getUserProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'
import { User as UserIcon, Cpu as CpuIcon, Camera as CameraIcon } from '@element-plus/icons-vue'

import BasicInfoCard from '@/components/profile/BasicInfoCard.vue'
import SecurityCard from '@/components/profile/SecurityCard.vue'
import ServiceConfigCard from '@/components/profile/ServiceConfigCard.vue'

const profile = ref({
  username: '',
  email: '',
  ai_api_key: '',
  ai_api_url: '',
  ai_model: '',
  ocr_api_key: '',
  ocr_api_url: '',
  ocr_model: '',
})
const loading = ref(true)

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
      ocr_api_key: response.data.ocr_api_key || '',
      ocr_api_url: response.data.ocr_api_url || '',
      ocr_model: response.data.ocr_model || '',
    }
  } catch (error) {
    ElMessage.error(`Failed to load profile: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const aiHelperText = {
  apiKey: 'Your API key for the AI service (e.g., OpenAI, Claude, etc.)',
  apiUrl: 'Example: https://api.openai.com/v1/',
  model: 'Example: gpt-4o, gpt-3.5-turbo, claude-3-sonnet',
}

const ocrHelperText = {
  apiKey: 'Your API key for the OCR service (e.g., Aliyun, Baidu, OpenAI Vision, etc.)',
  apiUrl: 'Example: https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'Example: qwen-vl-max, gpt-4-vision-preview',
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
    </div>

    <el-card class="border border-gray-200 shadow-card">
      <div v-if="loading" class="flex justify-center items-center h-48">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else>
        <!-- Basic Info -->
        <BasicInfoCard :profile="profile" @refresh="fetchProfile" />

        <!-- Password -->
        <SecurityCard @refresh="fetchProfile" />

        <!-- CODE AI Configuration -->
        <ServiceConfigCard
          title="AI Configuration"
          :icon="CpuIcon"
          prefix="ai"
          :profile="profile"
          :helper-text="aiHelperText"
          @refresh="fetchProfile"
        />

        <!-- OCR AI Configuration -->
        <ServiceConfigCard
          title="OCR AI Configuration"
          :icon="CameraIcon"
          prefix="ocr"
          :profile="profile"
          :helper-text="ocrHelperText"
          @refresh="fetchProfile"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.container {
  margin: 0 auto;
  max-width: 1440px;
  padding: 0 2rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
}
</style>
