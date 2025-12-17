<script setup>
import { ref, watch, nextTick } from 'vue'
import {
  Tickets as TicketsIcon,
  Upload as UploadIcon,
  Loading as LoadingIcon,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const textareaRef = ref(null)

watch(
  () => props.modelValue,
  async () => {
    if (!props.ocrUploading) return // Only scroll during auto-updates if desired? Or always?
    // User said "adding new content", usually implies the streaming case.
    // But if user types manually, scrolling to bottom might be annoying.
    // However, this component doesn't know *who* updated it easily.
    // But `ocrUploading` is true during streaming. So we can use that as a hint/guard if we want to ONLY scroll during streaming.
    // User said "when adding new content", implies streaming.
    // If I just watch modelValue, typing at the top might jump to bottom?
    // Let's assume we should scroll if we are in "uploading/generating" state.
    // But `ocrUploading` becomes false when done.
    // Let's just scroll always for now, or check if the change was an append?
    // Safer: scroll if `ocrUploading` is true.

    // Actually, checking `ocrUploading` is a good heuristic.
    if (props.ocrUploading) {
      await nextTick()
      const textarea =
        textareaRef.value?.textarea || textareaRef.value?.$el?.querySelector('textarea')
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight
      }
    }
  },
)
</script>

<template>
  <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
    <div
      class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
    >
      <div class="flex items-center gap-3 font-medium text-lg">
        <el-icon size="18"><TicketsIcon /></el-icon>
        <span>{{ t('session.problemDescription') }}</span>
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
        <span class="hidden md:inline">{{ t('session.ocrUpload') }}</span>
      </el-button>
    </div>
    <div class="p-4">
      <el-input
        ref="textareaRef"
        type="textarea"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :rows="12"
        :placeholder="t('session.problemPlaceholder')"
        class="!border-none !shadow-none description-textarea"
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
