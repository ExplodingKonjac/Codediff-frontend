<script setup>
import { ref, onMounted, onUnmounted, computed, h, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import MonacoEditor from 'vue-monaco'
import {
  ArrowLeftBold as ArrowLeftBoldIcon,
  Document as DocumentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DataAnalysis as DataAnalysisIcon,
  SuccessFilled as SuccessFilledIcon,
  User as UserIcon,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// New Components
// Async Components
import { defineAsyncComponent } from 'vue'

import CodeBlock from '@/components/session/CodeBlock.vue'
import ProblemDescription from '@/components/session/ProblemDescription.vue'
import OCRDialog from '@/components/session/OCRDialog.vue'
import ControlPanel from '@/components/session/ControlPanel.vue'
import TestCasesList from '@/components/session/TestCasesList.vue'

// Composables
import { useSession } from '@/composables/useSession'
import { useDiff } from '@/composables/useDiff'
import { useAI } from '@/composables/useAI'
import { useOCR } from '@/composables/useOCR'

MonacoEditor.render = () => h('div')

const router = useRouter()

// --- Editors Management ---
// USE shallowRef to avoid deep reactivity on Monaco Editor instances (which causes freezing)
const editors = shallowRef({
  generator: null,
  standard: null,
  user: null,
})

const onGenEditorMounted = (editor) => (editors.value.generator = editor)
const onStdEditorMounted = (editor) => (editors.value.standard = editor)
const onUserEditorMounted = (editor) => (editors.value.user = editor)

// --- Session Management ---
const {
  sessionId,
  session,
  loading,
  hasUnsavedChanges,
  markUnsaved,
  fetchSession,
  saveSession: _saveSession, // Renamed to avoid conflict
  editSessionTitle,
  deleteSessionConfirm,
  cleanup: cleanupSession,
} = useSession()

// Wrapper for saveSession to pass editors
const saveSession = () => _saveSession(editors.value)

// --- Diff Logic ---
const maxTests = ref(100)
const selectedChecker = ref('wcmp')

const {
  currentStatus,
  isGenerating,
  generatedCount,
  diffFailed,
  failureMessage,
  failureDetail,
  resetDiffState,
  startContinuousGeneration: _startContinuousGeneration, // Renamed to avoid conflict
  stopContinuousGeneration,
  testExistingData: _testExistingData, // Renamed to avoid conflict
} = useDiff(session, sessionId, hasUnsavedChanges, saveSession)

// Wrapper for startContinuousGeneration to pass maxTests and selectedChecker
const startContinuousGeneration = () =>
  _startContinuousGeneration(maxTests.value, selectedChecker.value)
const testExistingData = () => _testExistingData(selectedChecker.value)

// Checker options constant... (keeping it here or moving to constants file is fine)
const checkerOptions = [
  {
    value: 'caseicmp',
    label: 'caseicmp',
    description: 'Single int64 checker with testcase-support',
  },
  {
    value: 'casencmp',
    label: 'casencmp',
    description: 'Many int64s checker with testcase-support',
  },
  {
    value: 'casewcmp',
    label: 'casewcmp',
    description: 'Tokens checker with testcase-support',
  },
  {
    value: 'dcmp',
    label: 'dcmp',
    description: 'compare two doubles, maximal absolute or relative error = 1e-6',
  },
  {
    value: 'fcmp',
    label: 'fcmp',
    description: 'compare files as sequence of lines',
  },
  {
    value: 'hcmp',
    label: 'hcmp',
    description: 'compare two signed huge integers',
  },
  {
    value: 'icmp',
    label: 'icmp',
    description: 'compare two signed ints',
  },
  {
    value: 'lcmp',
    label: 'lcmp',
    description: 'compare files as sequence of tokens in lines',
  },
  {
    value: 'ncmp',
    label: 'ncmp',
    description: 'compare ordered sequences of long longs',
  },
  {
    value: 'nyesno',
    label: 'nyesno',
    description: 'multiple YES / NO (case insensitive)',
  },
  {
    value: 'rcmp',
    label: 'rcmp',
    description: 'compare two doubles, maximal absolute error = 1.5e-6',
  },
  {
    value: 'rcmp4',
    label: 'rcmp4',
    description: 'compare two sequences of doubles, max absolute or relative error = 1e-4',
  },
  {
    value: 'rcmp6',
    label: 'rcmp6',
    description: 'compare two sequences of doubles, max absolute or relative error = 1e-6',
  },
  {
    value: 'rcmp9',
    label: 'rcmp9',
    description: 'compare two sequences of doubles, max absolute or relative error = 1e-9',
  },
  {
    value: 'rncmp',
    label: 'rncmp',
    description: 'compare two sequences of doubles, maximal absolute error = 1.5e-5',
  },
  {
    value: 'uncmp',
    label: 'uncmp',
    description: 'compare unordered sequences of long longs',
  },
  {
    value: 'wcmp',
    label: 'wcmp',
    description: 'compare sequences of tokens',
  },
  {
    value: 'yesno',
    label: 'yesno',
    description: 'YES / NO (case insensitive)',
  },
]

// --- AI Logic ---
const {
  aiStreaming,
  generateCodeStreaming: _generateCodeStreaming, // Renamed to avoid conflict
  stopAIGeneration,
  cleanupAI,
} = useAI(session, sessionId, markUnsaved)

// Wrapper for generateCodeStreaming to pass the specific editor
const generateCodeStreaming = (type) => _generateCodeStreaming(type, editors.value[type])

// --- OCR Logic ---
const {
  ocrUploading,
  ocrDialogVisible,
  ocrImageFile,
  ocrImageUrl,
  handleOCRFileChange,
  handleOCRPaste,
  performOCR,
  resetOCRState,
} = useOCR(session, markUnsaved)

// --- Computed Properties for Bindings ---
const safeDescription = computed({
  get: () => session.value?.description || '',
  set: (value) => {
    if (session.value) {
      session.value.description = String(value || '')
      markUnsaved()
    }
  },
})

// Helper factory for code computed properties
const createCodeComputed = (type, field) =>
  computed({
    get: () => session.value?.[`${type}_code`]?.[field] || (field === 'lang' ? 'cpp' : 'c++17'),
    set: (value) => {
      if (session.value) {
        if (!session.value[`${type}_code`]) {
          session.value[`${type}_code`] = { lang: 'cpp', std: 'c++17', content: '' }
        }
        session.value[`${type}_code`][field] = value
        markUnsaved()
      }
    },
  })

const genLanguage = createCodeComputed('gen', 'lang')
const genVersion = createCodeComputed('gen', 'std')
const stdLanguage = createCodeComputed('std', 'lang')
const stdVersion = createCodeComputed('std', 'std')
const userLanguage = createCodeComputed('user', 'lang')
const userVersion = createCodeComputed('user', 'std')

const languageOptions = [
  { value: 'cpp', label: 'C++', versions: ['c++11', 'c++14', 'c++17', 'c++20'] },
  { value: 'c', label: 'C', versions: ['c99', 'c11', 'c17'] },
]

// --- Lifecycle ---
onMounted(async () => {
  // Critical fix: Ensure Monaco is configured before loading session
  await new Promise((resolve) => setTimeout(resolve, 100))
  fetchSession()

  // Listen for page close, warn about unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = t('common.unsavedChanges')
    }
  })
})

onUnmounted(() => {
  stopContinuousGeneration()
  cleanupAI() // Clean up AI state
  cleanupSession() // Clean up session state (e.g., save timeout)
  window.removeEventListener('beforeunload', () => {})
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <el-button
          @click="router.push('/')"
          circle
          class="shadow-md hover:shadow-lg transition-shadow"
          :icon="ArrowLeftBoldIcon"
        />
        <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <span
            class="truncate max-w-[200px] sm:max-w-[400px] md:max-w-[600px]"
            :title="session?.title"
            >{{ session?.title || t('session.loading') }}</span
          >
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <el-button
          v-if="hasUnsavedChanges"
          type="warning"
          @click="saveSession"
          :loading="loading"
          class="px-4 py-2"
          :icon="EditIcon"
        >
          {{ t('session.saveChanges') }}
        </el-button>

        <el-button
          type="primary"
          @click="editSessionTitle"
          class="hidden md:flex px-5 py-2 text-lg font-medium"
          :icon="EditIcon"
        >
          {{ t('session.editTitle') }}
        </el-button>

        <el-button
          type="danger"
          @click="deleteSessionConfirm"
          class="hidden md:flex px-5 py-2 text-lg font-medium"
          :icon="DeleteIcon"
        >
          {{ t('session.deleteSession') }}
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center h-96">
      <el-skeleton :rows="10" animated class="w-full" />
    </div>

    <div v-else-if="session" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Code Editors (2/3) -->
      <div class="col-span-2 code-section pr-3 space-y-6">
        <!-- 题目描述 -->
        <ProblemDescription
          v-model="safeDescription"
          :ocr-uploading="ocrUploading"
          @upload-ocr="ocrDialogVisible = true"
          @update:modelValue="markUnsaved"
        />

        <!-- 数据生成器 -->
        <CodeBlock
          :title="t('session.generatorTitle')"
          :icon="DataAnalysisIcon"
          header-class="bg-gradient-to-r from-purple-600 to-indigo-700"
          v-model="session.gen_code"
          v-model:language="genLanguage"
          v-model:version="genVersion"
          :languageOptions="languageOptions"
          type="generator"
          :ai-enabled="true"
          :ai-loading="aiStreaming.generator.loading"
          @editor-mount="onGenEditorMounted"
          @change="markUnsaved"
          @generate="(saveSession(), generateCodeStreaming('generator'))"
          @stop-generate="stopAIGeneration('generator')"
          @update:modelValue="markUnsaved"
        />

        <!-- 标准代码 -->
        <CodeBlock
          :title="t('session.standardTitle')"
          :icon="SuccessFilledIcon"
          header-class="bg-gradient-to-r from-green-600 to-emerald-700"
          v-model="session.std_code"
          v-model:language="stdLanguage"
          v-model:version="stdVersion"
          :languageOptions="languageOptions"
          type="standard"
          :ai-enabled="true"
          :ai-loading="aiStreaming.standard.loading"
          @editor-mount="onStdEditorMounted"
          @change="markUnsaved"
          @generate="(saveSession(), generateCodeStreaming('standard'))"
          @stop-generate="stopAIGeneration('standard')"
          @update:modelValue="markUnsaved"
        />

        <!-- 用户代码 -->
        <CodeBlock
          :title="t('session.userTitle')"
          :icon="UserIcon"
          header-class="bg-gradient-to-r from-blue-600 to-cyan-700"
          v-model="session.user_code"
          v-model:language="userLanguage"
          v-model:version="userVersion"
          :languageOptions="languageOptions"
          type="user"
          :ai-enabled="false"
          @editor-mount="onUserEditorMounted"
          @change="markUnsaved"
          @update:modelValue="markUnsaved"
        />
      </div>

      <!-- Right Column: Test Cases (1/3) -->
      <TestCasesList
        :test-cases="session.test_cases"
        :loading="loading"
        :is-generating="isGenerating"
        :failed="diffFailed"
        :failure-message="failureMessage"
        :failure-detail="failureDetail"
        @retry="resetDiffState"
        @generate-first="startContinuousGeneration"
      >
        <template #actions>
          <ControlPanel
            v-model:max-tests="maxTests"
            v-model:selected-checker="selectedChecker"
            :checker-options="checkerOptions"
            :current-status="currentStatus"
            :is-generating="isGenerating"
            :loading="loading"
            :has-test-cases="session.test_cases && session.test_cases.length > 0"
            @start="startContinuousGeneration"
            @stop="stopContinuousGeneration"
            @rerun="testExistingData"
          />
        </template>
      </TestCasesList>
    </div>

    <!-- OCR Dialog -->
    <OCRDialog
      v-model:visible="ocrDialogVisible"
      :ocr-image-url="ocrImageUrl"
      @cancel="resetOCRState"
      @perform-ocr="performOCR"
      @file-change="handleOCRFileChange"
      @paste="handleOCRPaste"
    />
  </div>
</template>

<style scoped>
/* 容器最大宽度和内边距 */
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* 滚动区域样式 */
.code-section {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 15px;
}
</style>
