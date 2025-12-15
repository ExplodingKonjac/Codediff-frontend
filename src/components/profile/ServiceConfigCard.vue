<script setup>
import { ref } from 'vue'
import { updateUserProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'
import { EditPen as EditPenIcon, Check as CheckIcon } from '@element-plus/icons-vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: Object, // Component
    required: true,
  },
  prefix: {
    type: String, // 'ai' or 'ocr'
    required: true,
  },
  profile: {
    type: Object,
    required: true,
  },
  helperText: {
    type: Object,
    default: () => ({
      apiKey: 'Your API key for the service',
      apiUrl: 'Endpoint URL for the service',
      model: 'Specific model identifier if applicable',
    }),
  },
})

const emit = defineEmits(['refresh'])

const showDialog = ref(false)
const form = ref({
  api_key: '',
  api_url: '',
  model: '',
})
const dialogLoading = ref(false)

const fieldKeys = {
  key: `${props.prefix}_api_key`,
  url: `${props.prefix}_api_url`,
  model: `${props.prefix}_model`,
}

const openDialog = () => {
  form.value = {
    api_key: props.profile[fieldKeys.key] || '',
    api_url: props.profile[fieldKeys.url] || '',
    model: props.profile[fieldKeys.model] || '',
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const updateConfig = async () => {
  try {
    dialogLoading.value = true

    const updates = {
      [fieldKeys.key]: form.value.api_key.trim(),
      [fieldKeys.url]: form.value.api_url.trim(),
      [fieldKeys.model]: form.value.model.trim(),
    }

    await updateUserProfile(updates)
    ElMessage.success(`${props.title} updated successfully`)
    closeDialog()
    emit('refresh')
  } catch (error) {
    ElMessage.error(`Failed to update configuration: ${error.message}`)
  } finally {
    dialogLoading.value = false
  }
}
</script>

<template>
  <div class="mb-6 pb-4 border-b border-gray-200">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-700 flex items-center gap-2">
        <el-icon class="text-blue-500"><component :is="icon" /></el-icon>
        <span>{{ title }}</span>
      </h2>
      <el-button type="warning" size="small" @click="openDialog" class="mt-2 sm:mt-0">
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
          profile[fieldKeys.url] || 'Not set'
        }}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-sm text-gray-500">Model</span>
        <span class="font-medium text-gray-800">{{ profile[fieldKeys.model] || 'Default' }}</span>
      </div>
    </div>

    <!-- Configuration Dialog -->
    <el-dialog
      v-model="showDialog"
      :title="`Update ${title}`"
      width="500px"
      @close="closeDialog"
      append-to-body
    >
      <el-form :model="form" label-position="top" class="space-y-4">
        <el-form-item :label="`${title} API Key`" prop="api_key">
          <el-input
            v-model="form.api_key"
            :placeholder="`Enter your ${title} API key`"
            type="password"
            show-password
          />
          <p class="text-xs text-gray-400 mt-1">
            {{ helperText.apiKey }}
          </p>
        </el-form-item>

        <el-form-item :label="`${title} API URL`" prop="api_url">
          <el-input v-model="form.api_url" placeholder="https://api.example.com/v1/" type="url" />
          <p class="text-xs text-gray-400 mt-1">{{ helperText.apiUrl }}</p>
        </el-form-item>

        <el-form-item :label="`${title} Model`" prop="model">
          <el-input v-model="form.model" placeholder="Model name (optional)" />
          <p class="text-xs text-gray-400 mt-1">{{ helperText.model }}</p>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer flex justify-end gap-3">
          <el-button @click="closeDialog">Cancel</el-button>
          <el-button type="primary" @click="updateConfig" :loading="dialogLoading">
            <el-icon class="mr-1"><CheckIcon /></el-icon>
            Save Configuration
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
