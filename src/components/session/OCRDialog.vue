<script setup>
import { ref, watch } from 'vue'
import { Camera } from '@element-plus/icons-vue'

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
  }
)

const handlePaste = (event) => {
  emit('paste', event)
}

const handleClose = () => {
  emit('cancel')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="Upload Image for OCR"
    width="500px"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <el-icon class="text-4xl text-gray-400 mb-3"><component :is="'upload'" /></el-icon>
        <p class="text-gray-600 mb-2">Drop image here or click to upload</p>
        <p class="text-gray-600 mb-2">You can also paste an image directly (Ctrl+V)</p>
        <p class="text-sm text-gray-500">Supports JPG, PNG, GIF (Max 5MB)</p>

        <el-upload
          class="mt-4"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          :on-change="(file) => $emit('file-change', file)"
        >
          <el-button type="primary">Select Image</el-button>
        </el-upload>
      </div>

      <div v-if="ocrImageUrl" class="mt-4">
        <p class="text-sm text-gray-600 mb-2">Preview:</p>
        <img
          :src="ocrImageUrl"
          alt="OCR Preview"
          class="max-w-full h-48 object-contain rounded border"
        />
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <el-button @click="$emit('cancel')">Cancel</el-button>
        <el-button type="primary" @click="$emit('perform-ocr')">
          <el-icon class="mr-1"><Camera /></el-icon>
          Perform OCR
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>
