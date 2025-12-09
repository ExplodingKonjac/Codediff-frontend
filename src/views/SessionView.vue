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
import TestcaseCard from '@/components/TestcaseCard.vue'
// 正确导入图标
import {
  ArrowLeftBold as ArrowLeftBoldIcon,
  Refresh as RefreshIcon,
  VideoPlay as VideoPlayIcon,
  Close as CloseIcon,
  Document as DocumentIcon,
  DocumentChecked as DocumentCheckedIcon,
  Warning as WarningIcon,
  FolderOpened as FolderOpenedIcon,
  Delete as DeleteIcon,
  House as HouseIcon,
  MagicStick as MagicStickIcon,
  User as UserIcon,
  SuccessFilled as SuccessFilledIcon,
  DataAnalysis as DataAnalysisIcon,
  Tickets as TicketsIcon,
  Edit as EditIcon,
  Loading as LoadingIcon,
  Upload as UploadIcon,
} from '@element-plus/icons-vue'

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
  session.value = { ...session.value }
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
        if (type === 'generator') {
          if (!session.value.gen_code) {
            session.value.gen_code = {
              lang: 'cpp',
              std: 'c++17',
              content: aiStreaming.value.generator.content,
            }
          } else {
            session.value.gen_code.content = aiStreaming.value.generator.content
            session.value.gen_code.lang = 'cpp'
            session.value.gen_code.std = 'c++17'
          }
        } else if (type === 'standard') {
          if (!session.value.std_code) {
            session.value.std_code = {
              lang: 'cpp',
              std: 'c++17',
              content: aiStreaming.value.standard.content,
            }
          } else {
            session.value.std_code.content = aiStreaming.value.standard.content
            session.value.std_code.lang = 'cpp'
            session.value.std_code.std = 'c++17'
          }
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

    // 连接错误
    aiSSEClient[type].onerror = (error) => {
      console.error('AI SSE connection error:', error)
      ElMessage.error('AI connection failed')
      stopAIGeneration(type)
    }
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
      // 将识别的文本追加到题目描述
      if (session.value.description) {
        session.value.description += '\n\n' + response.data.text
      } else {
        session.value.description = response.data.text
      }

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
        <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
          <div
            class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
          >
            <div class="flex items-center gap-3 font-medium text-lg">
              <el-icon size="18"><TicketsIcon /></el-icon>
              <span>Problem Description</span>
            </div>

            <!-- OCR 上传按钮 -->
            <el-button
              size="small"
              @click="handleOCRUpload"
              :enabled="!ocrUploading"
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
            <!-- 关键修复：使用 v-model 和 safeDescription 计算属性 -->
            <el-input
              type="textarea"
              v-model="safeDescription"
              :rows="3"
              placeholder="Describe the problem requirements and constraints..."
              class="!border-none !shadow-none"
              @input="markUnsaved()"
            />
          </div>
        </div>

        <!-- 数据生成器 (带AI按钮和语言选择) -->
        <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
          <div
            class="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white"
          >
            <div class="flex items-center gap-3 font-medium text-lg">
              <el-icon size="18"><DataAnalysisIcon /></el-icon>
              <span>Generator (C++/testlib)</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm hidden md:inline">Language:</span>
                <el-select v-model="genLanguage" size="small" class="!w-24">
                  <el-option
                    v-for="lang in languageOptions"
                    :key="lang.value"
                    :label="lang.label"
                    :value="lang.value"
                  />
                </el-select>
                <el-select v-model="genVersion" size="small" class="!w-24">
                  <el-option
                    v-for="version in languageOptions.find((l) => l.value === genLanguage)
                      ?.versions || []"
                    :key="version"
                    :label="version.toUpperCase()"
                    :value="version"
                  />
                </el-select>
              </div>
              <div class="flex items-center">
                <el-button
                  v-if="!aiStreaming.generator.loading"
                  size="small"
                  @click="generateCodeStreaming('generator')"
                  class="!h-8 !px-3 !text-sm !bg-white/20 hover:!bg-white/30 font-medium flex items-center gap-1"
                  style="--el-button-text-color: white; --el-button-hover-text-color: white"
                >
                  <el-icon size="16" class="text-white"><MagicStickIcon /></el-icon>
                  <span class="hidden md:inline">AI Generate</span>
                </el-button>
                <el-button
                  v-else
                  size="small"
                  @click="stopAIGeneration('generator')"
                  class="!h-8 !px-3 !text-sm !bg-red-500/20 hover:!bg-red-500/30 font-medium text-white flex items-center gap-1"
                  style="--el-button-text-color: white; --el-button-hover-text-color: white"
                >
                  <el-icon size="16" class="text-white animate-spin"><LoadingIcon /></el-icon>
                  <span class="hidden md:inline">Generating...</span>
                </el-button>
              </div>
            </div>
          </div>
          <div class="h-[320px]">
            <MonacoEditor
              v-if="session.gen_code"
              :value="session.gen_code.content || ''"
              @editorDidMount="onGenEditorMounted"
              @change="handleGenCodeChanged"
              :language="genLanguage === 'c' ? 'c' : 'cpp'"
              theme="vs-dark"
              :options="{
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
              }"
              class="h-full"
            />
            <!-- 添加加载状态 -->
            <div v-else class="h-full flex items-center justify-center">
              <el-skeleton :rows="10" animated />
            </div>
          </div>
        </div>

        <!-- 标准代码 (带AI按钮和语言选择) -->
        <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
          <div
            class="flex items-center justify-between p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white"
          >
            <div class="flex items-center gap-3 font-medium text-lg">
              <el-icon size="18"><SuccessFilledIcon /></el-icon>
              <span>Standard Code</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm hidden md:inline">Language:</span>
                <el-select v-model="stdLanguage" size="small" class="!w-24">
                  <el-option
                    v-for="lang in languageOptions"
                    :key="lang.value"
                    :label="lang.label"
                    :value="lang.value"
                  />
                </el-select>
                <el-select v-model="stdVersion" size="small" class="!w-24">
                  <el-option
                    v-for="version in languageOptions.find((l) => l.value === stdLanguage)
                      ?.versions || []"
                    :key="version"
                    :label="version.toUpperCase()"
                    :value="version"
                  />
                </el-select>
              </div>
              <div class="flex items-center">
                <el-button
                  v-if="!aiStreaming.standard.loading"
                  size="small"
                  @click="generateCodeStreaming('standard')"
                  class="!h-8 !px-3 !text-sm !bg-white/20 hover:!bg-white/30 font-medium text-white flex items-center gap-1"
                  style="--el-button-text-color: white; --el-button-hover-text-color: white"
                >
                  <el-icon size="16" class="text-white"><MagicStickIcon /></el-icon>
                  <span class="hidden md:inline">AI Generate</span>
                </el-button>
                <el-button
                  v-else
                  size="small"
                  @click="stopAIGeneration('standard')"
                  class="!h-8 !px-3 !text-sm !bg-red-500/20 hover:!bg-red-500/30 font-medium text-white flex items-center gap-1"
                  style="--el-button-text-color: white; --el-button-hover-text-color: white"
                >
                  <el-icon size="16" class="text-white animate-spin"><LoadingIcon /></el-icon>
                  <span class="hidden md:inline">Generating...</span>
                </el-button>
              </div>
            </div>
          </div>
          <div class="h-[320px]">
            <MonacoEditor
              v-if="session.std_code"
              @editorDidMount="onStdEditorMounted"
              @change="handleStdCodeChanged"
              :value="session.std_code.content || ''"
              :language="stdLanguage === 'c' ? 'c' : 'cpp'"
              theme="vs-dark"
              :options="{
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
              }"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center">
              <el-skeleton :rows="10" animated />
            </div>
          </div>
        </div>

        <!-- 用户代码 (带语言选择) -->
        <div class="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
          <div
            class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-cyan-700 text-white"
          >
            <div class="flex items-center gap-3 font-medium text-lg">
              <el-icon size="18"><UserIcon /></el-icon>
              <span>User Code</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm hidden md:inline">Language:</span>
              <el-select v-model="userLanguage" size="small" class="!w-24">
                <el-option
                  v-for="lang in languageOptions"
                  :key="lang.value"
                  :label="lang.label"
                  :value="lang.value"
                />
              </el-select>
              <el-select v-model="userVersion" size="small" class="!w-24">
                <el-option
                  v-for="version in languageOptions.find((l) => l.value === userLanguage)
                    ?.versions || []"
                  :key="version"
                  :label="version.toUpperCase()"
                  :value="version"
                />
              </el-select>
            </div>
          </div>
          <div class="h-[320px]">
            <MonacoEditor
              v-if="session.user_code"
              :value="session.user_code.content || ''"
              @editorDidMount="onUserEditorMounted"
              @change="handleUserCodeChanged"
              :language="userLanguage === 'c' ? 'c' : 'cpp'"
              theme="vs-dark"
              :options="{
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
              }"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center">
              <el-skeleton :rows="10" animated />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Test Cases (1/3) -->
      <div class="history-section flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <el-icon class="text-blue-500 text-2xl"><DocumentCheckedIcon /></el-icon>
            <span>History Test Cases ({{ session.test_cases?.length || 0 }})</span>
          </h2>
        </div>

        <!-- 失败信息 -->
        <div
          v-if="diffFailed"
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
          <el-button type="danger" size="medium" @click="resetDiffState" class="mt-6 px-6 py-2">
            <el-icon class="mr-1"><RefreshIcon /></el-icon>
            Try Again
          </el-button>
        </div>

        <!-- 测试用例容器 - 独立滚动区域 -->
        <div v-else class="test-cases-container">
          <div v-if="loading && !isGenerating" class="flex justify-center items-center h-64">
            <el-skeleton :rows="6" animated class="w-full" />
          </div>

          <div
            v-else-if="!session.test_cases || session.test_cases.length === 0"
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
              @click="startContinuousGeneration"
              class="mt-2 px-4 py-2"
            >
              <el-icon class="mr-1"><RefreshIcon /></el-icon>
              Generate First Test
            </el-button>
          </div>

          <transition-group name="list" tag="div" class="space-y-3" v-else>
            <TestcaseCard
              v-for="(testcase, index) in session.test_cases"
              :key="`${testcase.id}-${index}`"
              :testcase="testcase"
              :is-expanded="false"
            />
          </transition-group>
        </div>

        <!-- 固定的操作按钮区域 -->
        <div class="action-buttons">
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-1 font-medium">
              <span>Current status: {{ currentStatus }}</span>
            </div>
          </div>

          <!-- ===== 修正：max_tests 和 checker 控制器 ===== -->
          <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <!-- 垂直布局容器 -->
            <div class="flex flex-col gap-3">
              <!-- Max Tests 行 -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <label class="text-sm font-medium text-gray-700 min-w-[80px]">Max Tests</label>
                <el-input-number
                  v-model="maxTests"
                  :min="1"
                  :max="1000"
                  placeholder="Max tests to generate"
                  class="w-full sm:w-auto flex-1"
                />
                <p class="text-xs text-gray-500 sm:text-right">Tests to generate (1-1000)</p>
              </div>

              <!-- Checker 选择器 -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <label class="text-sm font-medium text-gray-700 min-w-[80px]">Checker</label>
                <div class="w-full sm:w-auto flex-1">
                  <el-select
                    v-model="selectedChecker"
                    placeholder="Select checker"
                    class="w-full"
                    :filterable="true"
                  >
                    <el-option
                      v-for="checker in checkerOptions"
                      :key="checker.value"
                      :label="checker.label"
                      :value="checker.value"
                    >
                      <el-popover trigger="hover" :content="checker.description" placement="right">
                        <template #reference>
                          <div class="flex justify-between items-center">
                            {{ checker.label }}
                          </div>
                        </template>
                      </el-popover>
                    </el-option>
                  </el-select>
                </div>
                <p class="text-xs text-gray-500 mt-1">Checker to judge outputs</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <el-button
              v-if="!isGenerating"
              type="primary"
              size="large"
              @click="startContinuousGeneration"
              :disabled="loading"
              class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              <el-icon class="mr-1 text-lg"><RefreshIcon /></el-icon>
              <span>Continuous Diff</span>
            </el-button>

            <el-button
              v-if="isGenerating"
              type="danger"
              size="large"
              @click="stopContinuousGeneration"
              class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              <el-icon class="mr-1 text-lg"><CloseIcon /></el-icon>
              <span>Stop Diff</span>
            </el-button>

            <el-button
              type="warning"
              size="large"
              @click="testExistingData"
              :disabled="loading || !session.test_cases || session.test_cases.length === 0"
              class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              <el-icon class="mr-1 text-lg"><VideoPlayIcon /></el-icon>
              <span>Rerun Tests</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center h-96">
      <el-icon class="text-yellow-500 text-6xl mb-6"><WarningIcon /></el-icon>
      <p class="text-2xl text-gray-700 font-bold mb-4">Session not found</p>
      <el-button type="primary" size="large" @click="router.push('/')" class="px-8 py-4 text-lg">
        <el-icon class="mr-2"><HouseIcon /></el-icon>
        Go to Home
      </el-button>
    </div>
  </div>

  <el-dialog
    v-model="ocrDialogVisible"
    title="Upload Image for OCR"
    width="500px"
    @close="resetOCRState"
  >
    <div class="space-y-4">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <el-icon name="upload" class="text-4xl text-gray-400 mb-3"></el-icon>
        <p class="text-gray-600 mb-2">Drop image here or click to upload</p>
        <p class="text-gray-600 mb-2">You can also paste an image directly (Ctrl+V)</p>
        <p class="text-sm text-gray-500">Supports JPG, PNG, GIF (Max 5MB)</p>

        <el-upload
          class="mt-4"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          :on-change="handleOCRFileChange"
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
        <el-button @click="resetOCRState">Cancel</el-button>
        <el-button type="primary" @click="performOCR">
          <el-icon class="mr-1"><Camera /></el-icon>
          Perform OCR
        </el-button>
      </div>
    </div>
  </el-dialog>
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
.history-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px); /* 与左侧栏相同的高度限制 */
  overflow: hidden; /* 防止内部溢出 */
}

/* 移除按钮背景 */
.action-buttons {
  padding: 20px 0;
  background: transparent !important;
  box-shadow: none !important;
}

/* 确保下拉框内容完整显示 */
:deep(.el-select__wrapper) {
  overflow: visible !important;
}

:deep(.el-select-dropdown__item) {
  white-space: nowrap !important;
  overflow: visible !important;
}

/* 滚动条样式 */
.test-cases-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  margin-bottom: 16px;
  /* 精细滚动条样式 */
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

/* 操作按钮固定底部 */
.action-buttons {
  flex-shrink: 0; /* 确保按钮区域不收缩 */
  padding: 16px 0;
  background: white;
  border-top: 1px solid #e2e8f0;
  margin-top: auto; /* 推到容器底部 */
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .history-section {
    max-height: calc(100vh - 250px);
  }

  .action-buttons {
    position: sticky;
    bottom: 0;
    background: white;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  }
}

/* 状态显示样式 */
.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-success {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.status-error {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}

.status-warning {
  background-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
}

.status-info {
  background-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* 失败消息样式 */
.failure-container {
  border-radius: 16px !important;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #fecaca;
}

.failure-title {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: #b91c1c !important;
}

.failure-message {
  font-size: 1.1rem !important;
  color: #454545 !important;
}

.failure-detail {
  font-size: 0.9rem !important;
  line-height: 1.6 !important;
  max-height: 20rem !important;
}

/* 按钮加载动画 */
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

/* 按钮禁用状态 */
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 选择器样式优化 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 6px !important;
}

:deep(.el-input-number .el-input__wrapper) {
  border-radius: 6px !important;
}

/* 控制器区域样式 */
.controller-group {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

/* 优化选项样式 */
:deep(.el-select-dropdown__item) {
  padding: 12px 16px !important;
  line-height: 1.5 !important;
}

/* 优化 popover 样式 */
:deep(.el-popover) {
  max-width: 300px;
  word-break: break-word;
  line-height: 1.5;
}

/* 确保下拉菜单在顶部显示 */
:deep(.el-select-dropdown) {
  z-index: 9999 !important;
}

/* 选项悬浮效果 */
:deep(.el-select-dropdown__item:hover) {
  background-color: #f3f4f6 !important;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .controller-group {
    flex-direction: column !important;
    gap: 12px !important;
  }

  .action-buttons {
    position: sticky !important;
    bottom: 0 !important;
    background: white !important;
    padding: 16px !important;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05) !important;
  }

  /* 在小屏幕上，让输入框占据全宽 */
  .controller-group > div {
    width: 100% !important;
  }

  .controller-group .el-input-number,
  .controller-group .el-select {
    width: 100% !important;
  }
}
</style>
