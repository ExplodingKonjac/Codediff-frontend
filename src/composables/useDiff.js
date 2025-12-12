import { ref, nextTick, toRaw } from 'vue'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { stopContinuousDiff as apiStopContinuousDiff } from '@/api/diff'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

export function useDiff(session, sessionId, hasUnsavedChanges, saveSession) {
  const authStore = useAuthStore()
  
  const currentStatus = ref('Ready')
  const isGenerating = ref(false)
  const generatedCount = ref(0)
  const diffFailed = ref(false)
  const failureMessage = ref('')
  const failureDetail = ref('')
  let sseClient = null

  const resetDiffState = () => {
    diffFailed.value = false
    failureMessage.value = ''
    failureDetail.value = ''
    currentStatus.value = 'Ready'
    if (session.value) {
      session.value.test_cases = []
    }
  }

  const scrollToBottom = () => {
    nextTick(() => {
      const container = document.querySelector('.test-cases-container')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }

  const stopContinuousGeneration = () => {
    isGenerating.value = false
    if (sseClient) {
      sseClient.close()
      sseClient = null
    }

    if (sessionId.value){
        apiStopContinuousDiff(sessionId.value).catch((error) => {
        console.error('Failed to stop continuous diff:', error)
        })
    }
  }

  const getDiffSSEClient = (sseUrl) => {
    const token = authStore.token
    if (!token) throw new Error('Authentication required')

    const client = new EventSourcePolyfill(sseUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      heartbeatTimeout: 30000,
      connectionTimeout: 10000,
    })

    client.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data)
        currentStatus.value = data.status || 'Unknown status'
      } catch (e) {
        console.error(e)
      }
    })

    client.addEventListener('failed', (event) => {
      try {
        const data = JSON.parse(event.data)
        diffFailed.value = true
        currentStatus.value = 'Diff failed'
        failureMessage.value = data.message || 'Unknown error'
        failureDetail.value = data.detail || ''
        stopContinuousGeneration()
        ElMessage.error(`Diff failed: ${failureMessage.value}`)
      } catch (e) {
        console.error(e)
      }
    })
    
     client.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data)
          currentStatus.value = `Error: ${data.message || 'Unknown error'}`
          ElMessage.error(`SSE Error: ${data.message || 'Unknown error'}`)
        } catch (e) {
          console.error('Error parsing error event:', e)
        }
      })

    client.addEventListener('test_result', async (event) => {
      try {
        const data = JSON.parse(event.data)
        if (!data.test_case) return

        const newTestCase = {
          id: session.value.test_cases.length + 1,
          ...data.test_case,
          created_at: data.test_case.created_at || new Date().toISOString(),
        }

        session.value.test_cases.push(newTestCase)
        generatedCount.value++
        await nextTick()
        scrollToBottom()
      } catch (error) {
        console.error('Error processing test result:', error)
      }
    })

    client.addEventListener('finish', () => {
      currentStatus.value = 'Diff finished'
      ElMessage.success('Diff finished successfully!')
      stopContinuousGeneration()
    })

    client.onerror = (error) => {
      console.error('SSE connection error:', error)
      let errorMessage = 'SSE Connection error'
      if (error?.status === 401) {
          errorMessage = 'Authentication failed.'
          authStore.logout()
      } else if (error?.status === 403) errorMessage = "Permission denied."
      else if (error?.status >= 500) errorMessage = 'Server error.'
      
      currentStatus.value = `Error: ${errorMessage}`
      ElMessage.error(errorMessage)
      stopContinuousGeneration()
    }

    client.onopen = () => {
      currentStatus.value = 'Connection established. Starting tests...'
    }

    return client
  }

  const handleUnsavedChanges = async () => {
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
          return true
        } else if (result === false) {
          return false
        }
      }
      return true
  }

  const startContinuousGeneration = async (maxTests, selectedChecker) => {
    if (isGenerating.value || !session.value) return
    
    if (!(await handleUnsavedChanges())) return

    session.value.test_cases = []
    diffFailed.value = false
    currentStatus.value = 'Starting continuous diff...'
    isGenerating.value = true
    generatedCount.value = 0

    try {
      let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/start`)
      sseUrl.searchParams.set('max_tests', maxTests)
      if (selectedChecker) sseUrl.searchParams.set('checker', selectedChecker)
      sseClient = getDiffSSEClient(sseUrl)
    } catch (error) {
      ElMessage.error(`Failed to start: ${error.message}`)
      stopContinuousGeneration()
    }
  }
  
  const testExistingData = async (selectedChecker) => {
      if (isGenerating.value || !session.value) return
      if (!session.value?.test_cases?.length) {
          ElMessage.warning('No test cases to rerun')
          return
      }

      if (!(await handleUnsavedChanges())) return
      
      session.value.test_cases = []
      diffFailed.value = false
      currentStatus.value = 'Rerunning existing testcases...'
      isGenerating.value = true
      generatedCount.value = 0
      
      try {
        let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/rerun`)
        if (selectedChecker) sseUrl.searchParams.set('checker', selectedChecker)
        sseClient = getDiffSSEClient(sseUrl)
      } catch (error) {
        ElMessage.error(`Failed to rerun: ${error.message}`)
        stopContinuousGeneration()
      }
  }

  return {
    currentStatus,
    isGenerating,
    generatedCount,
    diffFailed,
    failureMessage,
    failureDetail,
    resetDiffState,
    startContinuousGeneration,
    stopContinuousGeneration,
    testExistingData
  }
}
