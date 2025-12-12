<script setup>
import {
  DocumentChecked as DocumentCheckedIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  FolderOpened as FolderOpenedIcon,
} from '@element-plus/icons-vue'
import TestcaseCard from '@/components/TestcaseCard.vue'

const props = defineProps({
  testCases: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  isGenerating: {
    type: Boolean,
    default: false,
  },
  failed: {
    type: Boolean,
    default: false,
  },
  failureMessage: {
    type: String,
    default: '',
  },
  failureDetail: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['retry', 'generate-first'])
</script>

<template>
  <div class="history-section flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
        <el-icon class="text-blue-500 text-2xl"><DocumentCheckedIcon /></el-icon>
        <span>History Test Cases ({{ testCases?.length || 0 }})</span>
      </h2>
    </div>

    <!-- Failure Message -->
    <div
      v-if="failed"
      class="flex flex-col items-center justify-center bg-red-50 rounded-xl border-2 border-dashed border-red-200 p-6"
    >
      <el-icon class="text-red-500 text-5xl mb-4"><WarningIcon /></el-icon>
      <h3 class="text-xl font-bold text-red-700 mb-2">Diff Failed</h3>
      <p class="text-gray-700 mb-4 text-center">{{ failureMessage }}</p>
      <div
        v-if="failureDetail"
        class="w-full bg-white rounded-lg border border-red-200 p-4 max-h-64 overflow-y-auto font-mono text-sm"
      >
        <p class="text-red-600 whitespace-pre-wrap">{{ failureDetail }}</p>
      </div>
      <el-button type="danger" size="medium" @click="$emit('retry')" class="mt-6 px-6 py-2">
        <el-icon class="mr-1"><RefreshIcon /></el-icon>
        Try Again
      </el-button>
    </div>

    <!-- Test Cases Container -->
    <div v-else class="test-cases-container">
      <div v-if="loading && !isGenerating" class="flex justify-center items-center h-64">
        <el-skeleton :rows="6" animated class="w-full" />
      </div>

      <div
        v-else-if="!testCases || testCases.length === 0"
        class="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300"
      >
        <el-icon class="text-gray-400 text-4xl mb-4"><FolderOpenedIcon /></el-icon>
        <p class="text-lg text-gray-600 mb-2">
          {{ isGenerating ? 'Generating test cases...' : 'No test cases yet' }}
        </p>
        <div v-if="isGenerating" class="mt-4">
          <el-skeleton :rows="3" animated class="w-full max-w-md" />
        </div>
        <el-button
          v-if="!isGenerating"
          type="primary"
          size="medium"
          @click="$emit('generate-first')"
          class="mt-2 px-4 py-2"
        >
          <el-icon class="mr-1"><RefreshIcon /></el-icon>
          Generate First Test
        </el-button>
      </div>

      <transition-group name="list" tag="div" class="space-y-3" v-else>
        <TestcaseCard
          v-for="(testcase, index) in testCases"
          :key="`${testcase.id}-${index}`"
          :testcase="testcase"
          :is-expanded="false"
        />
      </transition-group>
    </div>

    <!-- Slot for Action Buttons -->
    <slot name="actions"></slot>
  </div>
</template>

<style scoped>
.history-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
  overflow: hidden;
}

.test-cases-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  margin-bottom: 16px;
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f3f5;
}

.test-cases-container::-webkit-scrollbar {
  width: 8px;
}

.test-cases-container::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 4px;
}

.test-cases-container::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
}

.test-cases-container::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

@media (max-width: 1024px) {
  .history-section {
    max-height: calc(100vh - 250px);
  }
}
</style>
