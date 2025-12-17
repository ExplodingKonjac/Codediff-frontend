import { ref, nextTick, toRaw } from 'vue'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { stopContinuousDiff as apiStopContinuousDiff } from '@/api/diff'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

export function useDiff(session, sessionId, hasUnsavedChanges, saveSession) {
  const { t } = useI18n()
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

    if (sessionId.value) {
      apiStopContinuousDiff(sessionId.value).catch((error) => {
        console.error('Failed to stop continuous diff:', error)
      })
    }
  }

  const getDiffSSEClient = (sseUrl) => {
    const client = new EventSourcePolyfill(sseUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
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
        currentStatus.value = t('testcases.diffFailed')
        failureMessage.value = data.message || 'Unknown error'
        failureDetail.value = data.detail || ''
        stopContinuousGeneration()
        ElMessage.error(`${t('diff.failed')}: ${failureMessage.value}`)
      } catch (e) {
        console.error(e)
      }
    })

    client.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data)
        currentStatus.value = `${t('common.error')}: ${data.message || 'Unknown error'}`
        ElMessage.error(`${t('diff.sseError')}: ${data.message || 'Unknown error'}`)
      } catch (e) {
        console.error('Error parsing error event:', e)
      }
    })

    client.addEventListener('test_result', async (event) => {
      try {
        const data = JSON.parse(event.data)
        if (!data.test_case) return

        const newTestCase = {
          ...data.test_case,
          id: data.test_case.id || session.value.test_cases.length + 1,
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
      currentStatus.value = t('diff.finished')
      ElMessage.success(t('diff.finished'))
      stopContinuousGeneration()
    })

    client.onerror = (error) => {
      console.error('SSE connection error:', error)
      let errorMessage = t('diff.sseConnectionError')
      if (error?.status === 401) {
        errorMessage = t('diff.authFailed')
        authStore.logout()
      } else if (error?.status === 403) errorMessage = t('diff.permissionDenied')
      else if (error?.status >= 500) errorMessage = t('diff.serverError')

      currentStatus.value = `${t('common.error')}: ${errorMessage}`
      ElMessage.error(errorMessage)
      stopContinuousGeneration()
    }

    client.onopen = () => {
      currentStatus.value = t('diff.starting')
    }

    return client
  }

  const handleUnsavedChanges = async () => {
    if (hasUnsavedChanges.value) {
      const result = await ElMessageBox.confirm(
        t('diff.unsavedConfirmMessage'),
        t('diff.unsavedConfirmTitle'),
        {
          confirmButtonText: t('diff.saveAndStart'),
          cancelButtonText: t('diff.startWithoutSaving'),
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
    currentStatus.value = t('diff.starting')
    isGenerating.value = true
    generatedCount.value = 0

    try {
      let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/start`)
      sseUrl.searchParams.set('max_tests', maxTests)
      if (selectedChecker) sseUrl.searchParams.set('checker', selectedChecker)
      sseClient = getDiffSSEClient(sseUrl)
    } catch (error) {
      ElMessage.error(`${t('diff.startFailed')}: ${error.message}`)
      stopContinuousGeneration()
    }
  }

  const testExistingData = async (selectedChecker) => {
    if (isGenerating.value || !session.value) return
    if (!session.value?.test_cases?.length) {
      ElMessage.warning(t('diff.noTestCases'))
      return
    }

    if (!(await handleUnsavedChanges())) return

    session.value.test_cases = []
    diffFailed.value = false
    currentStatus.value = t('diff.rerunning')
    isGenerating.value = true
    generatedCount.value = 0

    try {
      let sseUrl = new URL(`${import.meta.env.VITE_API_URL}/diff/${sessionId.value}/rerun`)
      if (selectedChecker) sseUrl.searchParams.set('checker', selectedChecker)
      sseClient = getDiffSSEClient(sseUrl)
    } catch (error) {
      ElMessage.error(`${t('diff.rerunFailed')}: ${error.message}`)
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
    testExistingData,
  }
}
