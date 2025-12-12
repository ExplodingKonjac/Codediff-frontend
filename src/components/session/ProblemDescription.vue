<script setup>
import {
  Tickets as TicketsIcon,
  Upload as UploadIcon,
  Loading as LoadingIcon,
} from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  ocrUploading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'upload-ocr'])
</script>

<template>
  <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
    <div
      class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
    >
      <div class="flex items-center gap-3 font-medium text-lg">
        <el-icon size="18"><TicketsIcon /></el-icon>
        <span>Problem Description</span>
      </div>

      <!-- OCR Upload Button -->
      <el-button
        size="small"
        @click="$emit('upload-ocr')"
        :disabled="ocrUploading"
        class="!h-8 !px-3 !text-sm !bg-white/20 hover:!bg-white/30 font-medium flex items-center gap-1"
        style="--el-button-text-color: white; --el-button-hover-text-color: white"
      >
        <el-icon size="16" class="text-white">
          <el-icon v-if="!ocrUploading"><UploadIcon /></el-icon>
          <el-icon v-else class="animate-spin"><LoadingIcon /></el-icon>
        </el-icon>
        <span class="hidden md:inline">OCR Upload</span>
      </el-button>
    </div>
    <div class="p-4">
      <el-input
        type="textarea"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :rows="3"
        placeholder="Describe the problem requirements and constraints..."
        class="!border-none !shadow-none"
      />
    </div>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
