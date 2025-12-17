import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getSessionById, updateSession, deleteSession } from '@/api/sessions'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function useSession() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const sessionId = ref(route.params.id)
  const session = ref(null)
  const loading = ref(true)
  const hasUnsavedChanges = ref(false)
  let saveTimeout = null

  // Computed properties for languages and versions...
  // (We can keep them here or move them to a separate config/hook if they are too verbose)
  // For now, let's keep the core session logic here.

  const markUnsaved = () => {
    hasUnsavedChanges.value = true
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveSession, 10000)
  }

  const fetchSession = async () => {
    try {
      loading.value = true
      const response = await getSessionById(sessionId.value)
      const sessionData = response.data

      // Ensure data structure integrity (defaults)
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
        sessionData.test_cases.forEach((tc, i) => (tc.id = i + 1))
      }

      session.value = sessionData
    } catch (error) {
      ElMessage.error(`${t('session.loadFailed')}: ${error.message}`)
      router.push('/')
    } finally {
      loading.value = false
    }
  }

  const saveSession = async (editors = {}) => {
    if (!hasUnsavedChanges.value || !session.value) return

    try {
      // If editors are provided, update content from them
      if (editors.generator) session.value.gen_code.content = editors.generator.getValue()
      if (editors.standard) session.value.std_code.content = editors.standard.getValue()
      if (editors.user) session.value.user_code.content = editors.user.getValue()

      const updateData = {
        title: String(session.value.title || ''),
        description: String(session.value.description || ''),
        gen_code: { ...session.value.gen_code },
        std_code: { ...session.value.std_code },
        user_code: { ...session.value.user_code },
      }

      await updateSession(session.value.id, updateData)
      hasUnsavedChanges.value = false
      ElMessage.success(t('session.saveSuccess'))
    } catch (error) {
      console.error('Save error:', error)
      ElMessage.error(`${t('session.saveFailed')}: ${error.message || 'Unknown error'}`)
    }
  }

  const editSessionTitle = () => {
    ElMessageBox.prompt(t('session.editTitlePrompt'), t('session.editTitleHeader'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      inputValue: session.value?.title || '',
      inputErrorMessage: t('session.titleEmpty'),
      inputValidator: (value) => {
        if (!value?.trim()) return t('session.titleEmpty')
        return null
      },
    })
      .then(async ({ value }) => {
        const newTitle = value.trim()
        if (newTitle === session.value?.title) return

        session.value.title = newTitle
        markUnsaved()
        await saveSession()
        ElMessage.success(t('session.titleUpdateSuccess'))
      })
      .catch(() => {
        ElMessage.info(t('session.titleEditCanceled'))
      })
  }

  const deleteSessionConfirm = () => {
    ElMessageBox.confirm(t('session.deleteConfirmMessage'), t('session.deleteConfirmTitle'), {
      confirmButtonText: t('session.confirmDelete'),
      cancelButtonText: t('session.cancelDelete'),
      type: 'warning',
    })
      .then(async () => {
        try {
          await deleteSession(sessionId.value)
          ElMessage.success(t('session.deleteSuccess'))
          router.push('/')
        } catch (error) {
          ElMessage.error(`${t('session.deleteFailed')}: ${error.message}`)
        }
      })
      .catch(() => ElMessage.info(t('session.deleteCanceled')))
  }

  const cleanup = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
  }

  return {
    sessionId,
    session,
    loading,
    hasUnsavedChanges,
    markUnsaved,
    fetchSession,
    saveSession,
    editSessionTitle,
    deleteSessionConfirm,
    cleanup,
  }
}
