import { ref } from 'vue'
import { ocr as apiOcr } from '@/api/ai'
import { ElMessage } from 'element-plus'

export function useOCR(session, markUnsaved) {
  const ocrUploading = ref(false)
  const ocrDialogVisible = ref(false)
  const ocrImageFile = ref(null)
  const ocrImageUrl = ref('')

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
    try {
      const formData = new FormData()
      formData.append('image', ocrImageFile.value)

      const response = await apiOcr(formData)
      
      if (session.value) {
          session.value.description = (session.value.description || '') + '\n\n' + response.data.text
          markUnsaved()
      }
      
      ElMessage.success('OCR processed successfully')
      ocrDialogVisible.value = false
      
      // Cleanup
      ocrImageFile.value = null
      ocrImageUrl.value = ''
    } catch (error) {
      console.error('OCR error:', error)
      ElMessage.error(`OCR failed: ${error.message || 'Unknown error'}`)
    } finally {
      ocrUploading.value = false
    }
  }

  return {
    ocrUploading,
    ocrDialogVisible,
    ocrImageFile,
    ocrImageUrl,
    handleOCRFileChange,
    handleOCRPaste,
    startOCR
  }
}
