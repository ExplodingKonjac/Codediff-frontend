<script setup>
import { ref, onMounted, onUnmounted, computed, h, toRaw, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { useAuthStore } from '@/stores/auth'
import { getSessionById, updateSession, deleteSession } from '@/api/sessions'
import { stopContinuousDiff as apiStopContinuousDiff } from '@/api/diff'
import { ocr as apiOcr } from '@/api/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import MonacoEditor from 'vue-monaco'
import {
  ArrowLeftBold as ArrowLeftBoldIcon,
  Document as DocumentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DataAnalysis as DataAnalysisIcon,
  SuccessFilled as SuccessFilledIcon,
  User as UserIcon,
  Warning as WarningIcon,
  House as HouseIcon,
} from '@element-plus/icons-vue'

// New Components
import CodeBlock from '@/components/session/CodeBlock'
import ProblemDescription from '@/components/session/ProblemDescription'
import OCRDialog from '@/components/session/OCRDialog'
import ControlPanel from '@/components/session/ControlPanel'
import TestCasesList from '@/components/session/TestCasesList'

MonacoEditor.render = () => h('div')

const route = useRoute()
const router = useRouter()
const sessionId = ref(route.params.id)
const session = ref(null)
const loading = ref(true)
const isGenerating = ref(false)
const generatedCount = ref(0)
const hasUnsavedChanges = ref(false)
let sseClient = null
let saveTimeout = null
let aiSSEClient = {
  generator: null,
  standard: null,
}

const authStore = useAuthStore()

const editors = ref({
  generator: null,
  standard: null,
  user: null,
})

const diffFailed = ref(false)
const failureMessage = ref('')
const failureDetail = ref('')

const maxTests = ref(100)
const selectedChecker = ref('wcmp')

// 新增 OCR 相关状态
const ocrUploading = ref(false)
const ocrDialogVisible = ref(false)
const ocrImageFile = ref(null)
const ocrImageUrl = ref('')

// Checker 选项配置
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

// 语言选项
const languageOptions = [
  { value: 'cpp', label: 'C++', versions: ['c++11', 'c++14', 'c++17', 'c++20'] },
  { value: 'c', label: 'C', versions: ['c99', 'c11', 'c17'] },
]

// 语言和版本选择
const genLanguage = computed({
  get: () => session.value?.gen_code?.lang || 'cpp',
  set: (value) => {
    if (session.value) {
      if (!session.value.gen_code) {
        session.value.gen_code = { lang: value, std: 'c++17', content: '' }
      } else {
        session.value.gen_code.lang = value
      }
    }
    markUnsaved()
  },
})

const genVersion = computed({
  get: () => session.value?.gen_code?.std || 'c++17',
  set: (value) => {
    if (session.value) {
      if (!session.value.gen_code) {
        session.value.gen_code = { lang: 'cpp', std: value, content: '' }
      } else {
        session.value.gen_code.std = value
      }
    }
    markUnsaved()
  },
})

const stdLanguage = computed({
  get: () => session.value?.std_code?.lang || 'cpp',
  set: (value) => {
    if (session.value) {
      if (!session.value.std_code) {
        session.value.std_code = { lang: value, std: 'c++17', content: '' }
      } else {
        session.value.std_code.lang = value
      }
    }
    markUnsaved()
  },
})

const stdVersion = computed({
  get: () => session.value?.std_code?.std || 'c++17',
  set: (value) => {
    if (session.value) {
      if (!session.value.std_code) {
        session.value.std_code = { lang: 'cpp', std: value, content: '' }
      } else {
        session.value.std_code.std = value
      }
    }
    markUnsaved()
  },
})

const userLanguage = computed({
  get: () => session.value?.user_code?.lang || 'cpp',
  set: (value) => {
    if (session.value) {
      if (!session.value.user_code) {
        session.value.user_code = { lang: value, std: 'c++17', content: '' }
      } else {
        session.value.user_code.lang = value
      }
    }
    markUnsaved()
  },
})

const userVersion = computed({
  get: () => session.value?.user_code?.std || 'c++17',
  set: (value) => {
    if (session.value) {
      if (!session.value.user_code) {
        session.value.user_code = { lang: 'cpp', std: value, content: '' }
      } else {
        session.value.user_code.std = value
      }
    }
    markUnsaved()
  },
})

const currentStatus = ref('Ready')

// 新增 AI 按钮 loading 状态和流式内容
const aiStreaming = ref({
  generator: {
    loading: false,
    content: '',
    complete: false,
  },
  standard: {
    loading: false,
    content: '',
    complete: false,
  },
})

// 关键修复：确保计算属性正确工作
const safeDescription = computed({
  get: () => session.value?.description || '',
  set: (value) => {
    if (session.value) {
      session.value.description = String(value || '')
      markUnsaved()
    }
  },
})

// 重构 markUnsaved，简化逻辑
const markUnsaved = () => {
  hasUnsavedChanges.value = true
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveSession, 10000)
}

// 添加编辑标题方法
const editSessionTitle = () => {
  ElMessageBox.prompt('Enter new session title:', 'Edit Session Title', {
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    inputValue: session.value?.title || '',
    inputErrorMessage: 'Title cannot be empty',
    inputValidator: (value) => {
      if (!value?.trim()) {
        return 'Title cannot be empty'
      }
      return null
    },
  })
    .then(async ({ value }) => {
      const newTitle = value.trim()
      if (newTitle === session.value?.title) {
        return
      }

      // 更新本地数据
      session.value.title = newTitle
      markUnsaved()

      // 立即保存
      await saveSession()

      ElMessage.success('Session title updated successfully')
    })
    .catch(() => {
      ElMessage.info('Title edit canceled')
    })
}

const onGenEditorMounted = (editor) => {
  editors.value.generator = editor
}

const onStdEditorMounted = (editor) => {
  editors.value.standard = editor
}

const onUserEditorMounted = (editor) => {
  editors.value.user = editor
}

const handleGenCodeChanged = (value) => {
  if (session.value?.gen_code) {
    markUnsaved()
  }
}

const handleStdCodeChanged = (value) => {
  if (session.value?.std_code) {
    markUnsaved()
  }
}

const handleUserCodeChanged = (value) => {
  if (session.value?.user_code) {
    markUnsaved()
  }
}

const saveSession = async () => {
  if (!hasUnsavedChanges.value || !session.value) return

  try {
    // 从编辑器获取当前内容
    session.value.gen_code.content = toRaw(editors.value.generator).getValue()
    session.value.std_code.content = toRaw(editors.value.standard).getValue()
    session.value.user_code.content = toRaw(editors.value.user).getValue()

    // 构建更新数据
    const updateData = {
      title: String(session.value.title || ''),
      description: String(session.value.description || ''),
      gen_code: {
        lang: String(session.value.gen_code?.lang || 'cpp'),
        std: String(session.value.gen_code?.std || 'c++17'),
        content: String(session.value.gen_code?.content || ''),
      },
      std_code: {
        lang: String(session.value.std_code?.lang || 'cpp'),
        std: String(session.value.std_code?.std || 'c++17'),
        content: String(session.value.std_code?.content || ''),
      },
      user_code: {
        lang: String(session.value.user_code?.lang || 'cpp'),
        std: String(session.value.user_code?.std || 'c++17'),
        content: String(session.value.user_code?.content || ''),
      },
    }

    await updateSession(session.value.id, updateData)
    hasUnsavedChanges.value = false
    ElMessage.success('Session saved successfully')
  } catch (error) {
    console.error('Save error:', error)
    ElMessage.error(`Failed to save session: ${error.message || 'Unknown error'}`)
  }
}

const fetchSession = async () => {
  try {
    loading.value = true
    const response = await getSessionById(sessionId.value)

    // 确保数据结构完整
    const sessionData = response.data

    // 确保代码字段存在
    if (!sessionData.user_code) {
      sessionData.user_code = {
        lang: 'cpp',
        std: 'c++17',
        content:
          '// Enter your code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}',
      }
    }

    if (!sessionData.std_code) {
      sessionData.std_code = {
        lang: 'cpp',
        std: 'c++17',
        content:
          '// Standard solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}',
      }
    }

    if (!sessionData.gen_code) {
      sessionData.gen_code = {
        lang: 'cpp',
        std: 'c++17',
        content:
          '// Test data generator\n#include <iostream>\n#include <random>\nusing namespace std;\n\nint main() {\n    random_device rd;\n    mt19937 gen(rd());\n    uniform_int_distribution<> dis(1, 100);\n    \n    int a = dis(gen);\n    int b = dis(gen);\n    cout << a << " " << b << endl;\n    return 0;\n}',
      }
    }

    if (!sessionData.test_cases) {
      sessionData.test_cases = []
    } else {
      for (var i = 0; i < sessionData.test_cases.length; i++) {
        sessionData.test_cases[i].id = i + 1
      }
    }

    session.value = sessionData
  } catch (error) {
    ElMessage.error(`Failed to load session: ${error.message}`)
    router.push('/')
  } finally {
    loading.value = false
  }
}

const resetDiffState = () => {
  diffFailed.value = false
  failureMessage.value = ''
  failureDetail.value = ''
  currentStatus.value = 'Ready'
  // 重置测试用例
  if (session.value) {
    session.value.test_cases = []
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    const container = document.querySelector('.test-cases-container')
    if (container) {
      container.scrollTop = container.scrollHeight
      console.log('Scrolled to bottom, scrollTop:', container.scrollTop)
    } else {
      console.warn('Test cases container not found')
    }
  })
}

const getDiffSSEClient = (sseUrl) => {
  // 获取 token
  const token = authStore.token
  if (!token) {
    throw new Error('Authentication required. Please login again.')
  }

  sseClient = new EventSourcePolyfill(sseUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    heartbeatTimeout: 30000,
    connectionTimeout: 10000,
  })

  // 事件监听
  sseClient.addEventListener('status', (event) => {
    try {
      const data = JSON.parse(event.data)
      currentStatus.value = data.status || 'Unknown status'
      console.log('Current status:', currentStatus.value)
    } catch (e) {
      console.error('Error parsing status event:', e)
    }
  })

  sseClient.addEventListener('failed', (event) => {
    try {
      const data = JSON.parse(event.data)
      console.error('Diff failed:', data)

      diffFailed.value = true
      currentStatus.value = 'Diff failed'
      failureMessage.value = data.message || 'Unknown error occurred'
      failureDetail.value = data.detail || ''

      // 停止生成
      stopContinuousGeneration()

      // 显示错误消息
      ElMessage.error(`Diff failed: ${failureMessage.value}`)
    } catch (e) {
      console.error('Error parsing failed event:', e)
    }
  })

  sseClient.addEventListener('error', (event) => {
    try {
      const data = JSON.parse(event.data)
      currentStatus.value = `Error: ${data.message || 'Unknown error'}`
      ElMessage.error(`SSE Error: ${data.message || 'Unknown error'}`)
    } catch (e) {
      console.error('Error parsing error event:', e)
    }
  })

  sseClient.addEventListener('test_result', async (event) => {
    try {
      const data = JSON.parse(event.data)

      console.log('Test result received:', data)

      if (!data.test_case) {
        console.error('Missing test_case in SSE data:', data)
        return
      }

      try {
        // 创建新测试用例的响应式副本
        console.log(data)
        const newTestCase = {
          id: session.value.test_cases.length + 1,
          status: data.test_case.status || 'PENDING',
          input: data.test_case.input || '',
          output: data.test_case.output || '',
          answer: data.test_case.answer || '',
          detail: data.test_case.detail || '',
          time_used: data.test_case.time_used || 0,
          memory_used: data.test_case.memory_used || 0,
          created_at: data.test_case.created_at || new Date().toISOString(),
        }

        // 使用 Vue.set 确保响应性
        session.value.test_cases.push(newTestCase)
        generatedCount.value = generatedCount.value + 1

        console.log('Test cases count:', generatedCount.value)

        // 滚动到底部
        await nextTick()
        scrollToBottom()
      } catch (error) {
        console.error('Error processing test result:', error)
        ElMessage.warning('Failed to process test result')
      }
    } catch (e) {
      console.error('Error parsing test_result event:', e)
    }
  })

  sseClient.addEventListener('finish', () => {
    currentStatus.value = 'Diff finished'
    ElMessage.success('Diff finished successfully!')
    stopContinuousGeneration()
  })

  // 连接错误
  sseClient.onerror = (error) => {
    console.error('SSE connection error:', error)

    let errorMessage = 'SSE Connection error'

    if (
      error?.status === 401 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Unauthorized')
    ) {
      errorMessage = 'Authentication failed. Please login again.'
      authStore.logout()
      router.push('/login')
    } else if (error?.status === 403) {
      errorMessage = "You don't have permission to access this session."
    } else if (error?.status >= 500) {
      errorMessage = 'Server error. Please try again later.'
    }

    currentStatus.value = `Error: ${errorMessage}`
    ElMessage.error(errorMessage)
    stopContinuousGeneration()
  }

  // 连接成功
  sseClient.onopen = () => {
    console.log('SSE connection established with custom headers')
    currentStatus.value = 'Connection established. Starting tests...'
  }

  return sseClient
}

const startContinuousGeneration = async () => {
  if (isGenerating.value || !session.value) return

  // 保存未保存的更改
  if (hasUnsavedChanges.value) {
    const result = await ElMessageBox.confirm(
      'You have unsaved changes. Do you want to save them before starting?',
      'Unsaved Changes',
      {
        confirmButtonText: 'Save and Start',
        cancelButtonText: 'Start Without Saving',
        type: 'warning',
      },
    ).catch(() => false)

    if (result === 'confirm') {
      await saveSession()
    } else if (result === false) {
      return
    }
  }

  session.value.test_cases = []
  diffFailed.value = false

  currentStatus.value = 'Starting continuous diff...'
  isGenerating.value = true
  generatedCount.value = 0

  try {
    let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/start`)
    sseUrl.searchParams.set('max_tests', maxTests.value)
    if (selectedChecker.value) {
      sseUrl.searchParams.set('checker', selectedChecker.value)
    }

    sseClient = getDiffSSEClient(sseUrl)
  } catch (error) {
    console.error('Failed to start continuous diff:', error)
    currentStatus.value = `Error: ${error.message || 'Unknown error'}`
    ElMessage.error(`Failed to start continuous diff: ${error.message || 'Unknown error'}`)
    stopContinuousGeneration()
  }
}

const stopContinuousGeneration = () => {
  isGenerating.value = false
  if (sseClient) {
    sseClient.close()
    sseClient = null
  }

  // 调用后端 API 停止
  apiStopContinuousDiff(sessionId.value).catch((error) => {
    console.error('Failed to stop continuous diff:', error)
    ElMessage.warning('Failed to stop continuous diff on server')
  })
}

const testExistingData = async () => {
  if (isGenerating.value || !session.value) return

  if (!session.value || !session.value.test_cases || session.value.test_cases.length === 0) {
    ElMessage.warning('No test cases to rerun')
    return
  }

  // 保存未保存的更改
  if (hasUnsavedChanges.value) {
    const result = await ElMessageBox.confirm(
      'You have unsaved changes. Do you want to save them before rerunning?',
      'Unsaved Changes',
      {
        confirmButtonText: 'Save and Start',
        cancelButtonText: 'Start Without Saving',
        type: 'warning',
      },
    ).catch(() => false)

    if (result === 'confirm') {
      await saveSession()
    } else if (result === false) {
      return
    }
  }

  session.value.test_cases = []
  diffFailed.value = false

  currentStatus.value = 'Rerunning existing testcases...'
  isGenerating.value = true
  generatedCount.value = 0

  try {
    let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/rerun`)
    if (selectedChecker.value) {
      sseUrl.searchParams.set('checker', selectedChecker.value)
    }

    sseClient = getDiffSSEClient(sseUrl)
  } catch (error) {
    console.error('Failed to rerun existing testcases:', error)
    currentStatus.value = `Error: ${error.message || 'Unknown error'}`
    ElMessage.error(`Failed to rerun existing testcases: ${error.message || 'Unknown error'}`)
    stopContinuousGeneration()
  }
}

const deleteSessionConfirm = () => {
  ElMessageBox.confirm(
    'Are you sure you want to delete this session? All data will be permanently lost.',
    'Confirm Deletion',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await deleteSession(sessionId.value)
        ElMessage.success('Session deleted successfully')
        router.push('/')
      } catch (error) {
        ElMessage.error(`Failed to delete session: ${error.message}`)
      }
    })
    .catch(() => {
      ElMessage.info('Deletion canceled')
    })
}

const generateCodeStreaming = async (type) => {
  if (!session.value || !sessionId.value) {
    ElMessage.warning('Session not loaded')
    return
  }

  // 重置之前的状态
  aiStreaming.value[type] = {
    loading: true,
    content: '',
    complete: false,
  }

  try {
    // 获取 token
    const token = authStore.token
    if (!token) {
      throw new Error('Authentication required. Please login again.')
    }

    // 构建 SSE URL
    let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/ai/stream-generate`)
    sseUrl.searchParams.set('type', type)
    sseUrl.searchParams.set('session_id', sessionId.value)

    // 创建 SSE 连接
    aiSSEClient[type] = new EventSourcePolyfill(sseUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      heartbeatTimeout: 30000,
      connectionTimeout: 10000,
    })

    // 处理代码片段
    aiSSEClient[type].addEventListener('code_chunk', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received code chunk:', data)

        // 更新流式内容
        aiStreaming.value[type].content += data.content

        // 更新编辑器内容
        toRaw(editors.value[type]).setValue(aiStreaming.value[type].content)
      } catch (e) {
        console.error('Error parsing code chunk event:', e)
      }
    })

    // 处理完成事件
    aiSSEClient[type].addEventListener('finish', (event) => {
      try {
        ElMessage.success(
          `${type === 'generator' ? 'Generator' : 'Standard'} code generated successfully!`,
        )

        // 更新 session 数据
        const key = type === 'generator' ? 'gen_code' : 'std_code'
        if (!session.value[key]) {
          session.value[key] = {
            lang: 'cpp',
            std: 'c++17',
            content: aiStreaming.value[type].content,
          }
        } else {
          session.value[key].content = aiStreaming.value[type].content
          session.value[key].lang = 'cpp'
          session.value[key].std = 'c++17'
        }

        // 标记为未保存
        markUnsaved()
        stopAIGeneration(type)
      } catch (e) {
        console.error('Error handling finish event:', e)
      }
    })

    // 处理错误
    aiSSEClient[type].addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.error('AI generation error:', data)
        ElMessage.error(`AI generation failed: ${data.message || 'Unknown error'}`)
      } catch (e) {
        console.error('Error parsing error event:', e)
        ElMessage.error('AI generation failed')
      } finally {
        stopAIGeneration(type)
      }
    })
  } catch (error) {
    console.error('Failed to start AI generation:', error)
    ElMessage.error(`Failed to start AI generation: ${error.message || 'Unknown error'}`)
    stopAIGeneration(type)
  }
}

const stopAIGeneration = (type) => {
  if (aiSSEClient[type]) {
    aiSSEClient[type].close()
    aiSSEClient[type] = null
    aiStreaming.value[type].loading = false
    aiStreaming.value[type].complete = true
  }
}

const cleanupAIState = () => {
  if (aiSSEClient.generator) {
    aiSSEClient.generator.close()
    aiSSEClient.generator = null
  }
  if (aiSSEClient.standard) {
    aiSSEClient.standard.close()
    aiSSEClient.standard = null
  }

  aiStreaming.value = {
    generator: {
      loading: false,
      content: '',
      complete: false,
    },
    standard: {
      loading: false,
      content: '',
      complete: false,
    },
  }
}

// ===== 新增：OCR 相关方法 =====
const handleOCRUpload = () => {
  ocrDialogVisible.value = true
  ocrImageFile.value = null
  ocrImageUrl.value = ''
}

const handleOCRFileChange = (file) => {
  ocrImageFile.value = file.raw
  ocrImageUrl.value = URL.createObjectURL(file.raw)
}

const handleOCRPaste = (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile()
      ocrImageFile.value = blob
      ocrImageUrl.value = URL.createObjectURL(blob)
      break
    }
  }
}

const performOCR = async () => {
  if (!ocrImageFile.value) {
    ElMessage.warning('Please select an image file')
    return
  }

  try {
    ocrUploading.value = true
    ocrDialogVisible.value = false

    const response = await apiOcr(ocrImageFile.value)

    if (response.data && response.data.text) {
      session.value.description = response.data.text
      ElMessage.success('OCR completed successfully')
      markUnsaved()
    } else {
      throw new Error('Invalid OCR response')
    }
  } catch (error) {
    console.error('OCR failed:', error)
    ElMessage.error(`OCR failed: ${error.message || 'Unknown error'}`)
  } finally {
    ocrUploading.value = false
  }
}

const resetOCRState = () => {
  ocrDialogVisible.value = false
  ocrImageFile.value = null
  if (ocrImageUrl.value) {
    URL.revokeObjectURL(ocrImageUrl.value)
    ocrImageUrl.value = ''
  }
}

// 监听对话框关闭状态
watch(ocrDialogVisible, (val) => {
  if (val) {
    // 添加粘贴事件监听器
    document.addEventListener('paste', handleOCRPaste)
  } else {
    // 移除粘贴事件监听器
    document.removeEventListener('paste', handleOCRPaste)
  }
})

onMounted(async () => {
  // 关键修复：确保在加载 session 前配置 Monaco
  await new Promise((resolve) => setTimeout(resolve, 100))
  fetchSession()

  // 监听页面关闭，提醒保存
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }
  })
})

onUnmounted(() => {
  if (sseClient) {
    sseClient.close()
  }
  cleanupAIState() // 清理 AI 状态
  if (saveTimeout) clearTimeout(saveTimeout)
  window.removeEventListener('beforeunload', () => {})
  diffFailed.value = false
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
        >
          <el-icon size="20"><ArrowLeftBoldIcon /></el-icon>
        </el-button>
        <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <el-icon class="text-blue-500 text-3xl"><DocumentIcon /></el-icon>
          <span>{{ session?.title || 'Loading session...' }}</span>
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <el-button
          v-if="hasUnsavedChanges"
          type="warning"
          @click="saveSession"
          :loading="loading"
          class="px-4 py-2"
        >
          <el-icon class="mr-1"><EditIcon /></el-icon>
          Save Changes
        </el-button>

        <el-button
          type="primary"
          @click="editSessionTitle"
          class="hidden md:flex px-5 py-2 text-lg font-medium"
        >
          <el-icon class="mr-2 text-lg"><EditIcon /></el-icon>
          Edit Title
        </el-button>

        <el-button
          type="danger"
          @click="deleteSessionConfirm"
          class="hidden md:flex px-5 py-2 text-lg font-medium"
        >
          <el-icon class="mr-2 text-lg"><DeleteIcon /></el-icon>
          Delete Session
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
          @upload-ocr="handleOCRUpload"
          @update:modelValue="markUnsaved"
        />

        <!-- 数据生成器 -->
        <CodeBlock
          title="Generator (C++/testlib)"
          :icon="DataAnalysisIcon"
          header-class="bg-gradient-to-r from-purple-600 to-indigo-700"
          v-model="session.gen_code"
          type="generator"
          :ai-enabled="true"
          :ai-loading="aiStreaming.generator.loading"
          @editor-mount="onGenEditorMounted"
          @change="handleGenCodeChanged"
          @generate="generateCodeStreaming('generator')"
          @stop-generate="stopAIGeneration('generator')"
          @update:modelValue="markUnsaved"
        />

        <!-- 标准代码 -->
        <CodeBlock
          title="Standard Code"
          :icon="SuccessFilledIcon"
          header-class="bg-gradient-to-r from-green-600 to-emerald-700"
          v-model="session.std_code"
          type="standard"
          :ai-enabled="true"
          :ai-loading="aiStreaming.standard.loading"
          @editor-mount="onStdEditorMounted"
          @change="handleStdCodeChanged"
          @generate="generateCodeStreaming('standard')"
          @stop-generate="stopAIGeneration('standard')"
          @update:modelValue="markUnsaved"
        />

        <!-- 用户代码 -->
        <CodeBlock
          title="User Code"
          :icon="UserIcon"
          header-class="bg-gradient-to-r from-blue-600 to-cyan-700"
          v-model="session.user_code"
          type="user"
          :ai-enabled="false"
          @editor-mount="onUserEditorMounted"
          @change="handleUserCodeChanged"
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
