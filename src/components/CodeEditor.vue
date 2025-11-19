<script setup>
import { ref, onMounted, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
// 正确导入图标
import {
  Tickets as TicketsIcon,
  SuccessFilled as SuccessFilledIcon,
  User as UserIcon,
  DataAnalysis as DataAnalysisIcon,
  MagicStick as MagicStickIcon,
} from '@element-plus/icons-vue'

hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', c)

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: 'cpp',
  },
  title: {
    type: String,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const code = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    code.value = newVal || ''
  },
)

watch(code, (newVal) => {
  emit('update:modelValue', newVal)
  highlightCode()
})

const highlightCode = () => {
  const blocks = document.querySelectorAll('pre code')
  blocks.forEach((block) => {
    if (block.textContent.trim()) {
      hljs.highlightElement(block)
    }
  })
}

onMounted(() => {
  highlightCode()
})

const handleAI = () => {
  ElMessage.info('AI generation feature will be available soon!')
}
</script>

<template>
  <div class="mb-6 bg-white rounded-xl shadow-card overflow-hidden border border-gray-200">
    <div
      class="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
    >
      <div class="flex items-center gap-3 font-medium text-lg">
        <el-icon v-if="title.includes('题目')" size="18"><TicketsIcon /></el-icon>
        <el-icon v-else-if="title.includes('标准')" size="18"><SuccessFilledIcon /></el-icon>
        <el-icon v-else-if="title.includes('用户')" size="18"><UserIcon /></el-icon>
        <el-icon v-else size="18"><DataAnalysisIcon /></el-icon>
        <span>{{ title }}</span>
      </div>

      <div class="flex items-center gap-2">
        <el-button
          v-if="['数据生成器', '标准代码'].includes(title)"
          size="small"
          @click="handleAI"
          class="!h-8 !px-3 !text-sm !bg-white/20 hover:!bg-white/30 font-medium"
        >
          <el-icon size="16" class="mr-1"><MagicStickIcon /></el-icon>
          AI Generate
        </el-button>
      </div>
    </div>

    <div v-if="title.includes('题目')" class="p-4 border-t border-gray-200">
      <el-input
        type="textarea"
        v-model="code"
        :rows="3"
        placeholder="Describe the problem requirements and constraints..."
        class="!border-none !shadow-none"
      />
    </div>

    <div v-else class="bg-[#1e1e1e]">
      <pre
        class="overflow-x-auto max-h-[320px] overflow-y-auto"
      ><code :class="`language-${language}`">{{ code || '// Code will be displayed here' }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
/* 精细滚动条样式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #60a5fa #1e1e1e;
}

pre::-webkit-scrollbar {
  width: 8px;
}

pre::-webkit-scrollbar-track {
  background: #1e1e1e;
}

pre::-webkit-scrollbar-thumb {
  background: #60a5fa;
  border-radius: 4px;
}

pre:hover::-webkit-scrollbar-thumb {
  background: #3b82f6;
}

/* 代码编辑器高度限制 */
.code-section {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background: #60a5fa;
  border-radius: 5px;
  border: 2px solid #f1f3f5;
}

::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #5c6ac4;
}
</style>
