import { ref } from 'vue'
import { ocr as apiOcr } from '@/api/ai'
import { ElMessage } from 'element-plus'
import { fetchEventSource } from '@microsoft/fetch-event-source'

export function useOCR(session, markUnsaved) {
  const ocrUploading = ref(false)
  const ocrDialogVisible = ref(false)
  const ocrImageFile = ref(null)
  const ocrImageUrl = ref('')
  const abortController = ref(null)

  const handleOCRFileChange = (file) => {
    ocrImageFile.value = file.raw
    ocrImageUrl.value = URL.createObjectURL(file.raw)
  }

  const handleOCRPaste = (file) => {
    ocrImageFile.value = file
    ocrImageUrl.value = URL.createObjectURL(file)
  }

  const startOCR = async () => {
    if (!ocrImageFile.value) {
      ElMessage.warning('Please select or paste an image first')
      return
    }

    ocrUploading.value = true
    ocrDialogVisible.value = false
    try {
      const formData = new FormData()
      formData.append('image', ocrImageFile.value)

      const controller = new AbortController()
      abortController.value = controller

      await fetchEventSource(`${import.meta.env.VITE_API_URL}/ai/stream-ocr`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        openWhenHidden: true,
        credentials: 'include',
        async onopen(response) {
          if (response.ok) {
            session.value.description = ''
            return
          } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP error! status: ${response.status}`)
          } else {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
        },
        onmessage(msg) {
          if (msg.event === 'chunk') {
            const data = JSON.parse(msg.data)
            if (session.value) {
              session.value.description += data.content
            }
          } else if (msg.event === 'error') {
            const data = JSON.parse(msg.data)
            throw new Error(data.message)
          } else if (msg.event === 'finish') {
            ElMessage.success('OCR processed successfully')
          }
        },
        onerror(err) {
          if (controller.signal.aborted) {
            // If aborted by user, don't throw
            return
          }
          throw err
        },
      })

      markUnsaved()
      // Cleanup
      ocrImageFile.value = null
      ocrImageUrl.value = ''
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') return

      console.error('OCR error:', error)
      ElMessage.error(`OCR failed: ${error.message || 'Unknown error'}`)
    } finally {
      ocrUploading.value = false
      abortController.value = null
    }
  }

  const resetOCRState = () => {
    if (ocrUploading.value) return
    ocrImageFile.value = null
    ocrImageUrl.value = ''
    ocrDialogVisible.value = false
    ocrUploading.value = false
  }

  return {
    ocrUploading,
    ocrDialogVisible,
    ocrImageFile,
    ocrImageUrl,
    handleOCRFileChange,
    handleOCRPaste,
    performOCR: startOCR,
    resetOCRState,
  }
}
