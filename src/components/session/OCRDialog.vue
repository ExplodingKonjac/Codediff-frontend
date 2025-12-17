<script setup>
import { ref, watch } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  ocrImageUrl: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:visible', 'cancel', 'perform-ocr', 'file-change', 'paste'])

// Watch for visibility changes to add/remove paste listener
watch(
  () => props.visible,
  (val) => {
    if (val) {
      document.addEventListener('paste', handlePaste)
    } else {
      document.removeEventListener('paste', handlePaste)
    }
  },
)

const handlePaste = (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items
  for (const item of items) {
    if (item.type.indexOf('image') === 0) {
      const blob = item.getAsFile()
      emit('paste', blob)
      event.preventDefault() // Prevent default paste behavior
      break
    }
  }
}

const handleClose = () => {
  emit('cancel')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="t('ocr.dialogTitle')"
    width="500px"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <el-icon class="text-4xl text-gray-400 mb-3"><component :is="'upload'" /></el-icon>
        <p class="text-gray-600 mb-2">{{ t('ocr.dropText') }}</p>
        <p class="text-gray-600 mb-2">{{ t('ocr.pasteText') }}</p>
        <p class="text-sm text-gray-500">{{ t('ocr.supportsText') }}</p>

        <el-upload
          class="mt-4"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          :on-change="(file) => $emit('file-change', file)"
        >
          <el-button type="primary">{{ t('ocr.selectImageBtn') }}</el-button>
        </el-upload>
      </div>

      <div v-if="ocrImageUrl" class="mt-4">
        <p class="text-sm text-gray-600 mb-2">{{ t('ocr.preview') }}</p>
        <img
          :src="ocrImageUrl"
          alt="OCR Preview"
          class="max-w-full h-48 object-contain rounded border"
        />
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <el-button @click="$emit('cancel')">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="$emit('perform-ocr')">
          <el-icon class="mr-1"><Camera /></el-icon>
          {{ t('ocr.performOCR') }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>
