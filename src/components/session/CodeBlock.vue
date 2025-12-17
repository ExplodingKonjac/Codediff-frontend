<script setup>
import { computed, h, watch, shallowRef } from 'vue'
import MonacoEditor from 'vue-monaco'
import { MagicStick as MagicStickIcon, Loading as LoadingIcon } from '@element-plus/icons-vue'

MonacoEditor.render = () => h('div')

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: Object,
    required: true,
  },
  headerClass: {
    type: String,
    default: 'bg-gradient-to-r from-blue-500 to-cyan-600',
  },
  modelValue: {
    type: Object,
    required: true,
    default: () => ({ lang: 'cpp', std: 'c++17', content: '' }),
  },
  type: {
    type: String,
    required: true, // 'generator' | 'standard' | 'user'
  },
  aiEnabled: {
    type: Boolean,
    default: false,
  },
  aiLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'editor-mount',
  'change',
  'generate',
  'stop-generate',
])

const languageOptions = [
  { value: 'cpp', label: 'C++', versions: ['c++11', 'c++14', 'c++17', 'c++20'] },
  { value: 'c', label: 'C', versions: ['c99', 'c11', 'c17'] },
]

const currentLanguage = computed({
  get: () => props.modelValue.lang || 'cpp',
  set: (value) => {
    // Determine the valid versions for the selected language
    const targetLang = languageOptions.find((opt) => opt.value === value)
    const validVersions = targetLang ? targetLang.versions : []

    // If current std is not valid for the new language, switch to the default (last available)
    let newStd = props.modelValue.std
    if (!validVersions.includes(newStd)) {
      newStd = validVersions.length > 0 ? validVersions[validVersions.length - 1] : ''
    }

    emit('update:modelValue', { ...props.modelValue, lang: value, std: newStd })
  },
})

const currentVersion = computed({
  get: () => props.modelValue.std || 'c++17',
  set: (value) => {
    emit('update:modelValue', { ...props.modelValue, std: value })
  },
})

const editorOptions = {
  fontSize: 14,
  lineNumbers: 'on',
  minimap: { enabled: true },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  rulers: [80],
  tabSize: 4,
  insertSpaces: true,
  renderWhitespace: 'selection',
}

const handleEditorDidMount = (editor) => {
  editorRef.value = editor
  emit('editor-mount', editor)
}

const handleChange = (value) => {
  emit('change', value)
}

// Auto-scroll to bottom during AI generation
const editorRef = shallowRef(null)

watch(
  () => props.modelValue.content,
  () => {
    if (props.aiLoading && editorRef.value) {
      const lineCount = editorRef.value.getModel().getLineCount()
      editorRef.value.revealLine(lineCount)
    }
  },
)
</script>

<template>
  <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 text-white" :class="headerClass">
      <div class="flex items-center gap-3 font-medium text-lg">
        <el-icon size="18"><component :is="icon" /></el-icon>
        <span>{{ title }}</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Language Selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm hidden md:inline">Language:</span>
          <el-select v-model="currentLanguage" size="small" class="!w-24">
            <el-option
              v-for="lang in languageOptions"
              :key="lang.value"
              :label="lang.label"
              :value="lang.value"
            />
          </el-select>
          <el-select v-model="currentVersion" size="small" class="!w-24">
            <el-option
              v-for="version in languageOptions.find((l) => l.value === currentLanguage)
                ?.versions || []"
              :key="version"
              :label="version.toUpperCase()"
              :value="version"
            />
          </el-select>
        </div>

        <!-- AI Button -->
        <div v-if="aiEnabled" class="flex items-center">
          <el-button
            v-if="!aiLoading"
            size="small"
            @click="$emit('generate')"
            class="!h-8 !px-3 !text-sm !bg-white/20 hover:!bg-white/30 font-medium flex items-center gap-1"
            style="--el-button-text-color: white; --el-button-hover-text-color: white"
            :icon="MagicStickIcon"
          >
            <span class="hidden md:inline">AI Generate</span>
          </el-button>
          <el-button
            v-else
            size="small"
            @click="$emit('stop-generate')"
            class="!h-8 !px-3 !text-sm !bg-red-500/20 hover:!bg-red-500/30 font-medium text-white flex items-center gap-1"
            style="--el-button-text-color: white; --el-button-hover-text-color: white"
          >
            <el-icon class="animate-spin"><LoadingIcon /></el-icon>
            <span class="hidden md:inline">Generating...</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="h-[320px]">
      <MonacoEditor
        v-if="modelValue"
        :value="modelValue.content || ''"
        @editorDidMount="handleEditorDidMount"
        @change="handleChange"
        :language="currentLanguage === 'c' ? 'c' : 'cpp'"
        theme="vs-dark"
        :options="editorOptions"
        class="h-full"
      />
      <div v-else class="h-full flex items-center justify-center">
        <el-skeleton :rows="10" animated />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.suggest-widget) {
  visibility: hidden !important;
}
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
