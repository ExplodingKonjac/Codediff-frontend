import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getSessions, createSession } from '@/api/sessions'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function useSessionsList() {
  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()

  const sessions = ref([])
  const loading = ref(true)

  // Pagination & Sorting state
  const pagination = ref({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0,
  })

  const sortConfig = ref({
    sort: 'updated_at',
    order: 'desc',
  })

  const sortOptions = computed(() => [
    { label: t('home.sort.updated_at'), value: 'updated_at' },
    { label: t('home.sort.created_at'), value: 'created_at' },
    { label: t('home.sort.title'), value: 'title' },
  ])

  const sortOrderOptions = computed(() => [
    { label: t('home.sort.desc'), value: 'desc' },
    { label: t('home.sort.asc'), value: 'asc' },
  ])

  // Actions
  const fetchSessions = async () => {
    try {
      loading.value = true
      const response = await getSessions({
        page: pagination.value.page,
        per_page: pagination.value.per_page,
        sort: sortConfig.value.sort,
        order: sortConfig.value.order,
      })

      sessions.value = response.data.sessions || []
      pagination.value = {
        page: response.data.page,
        per_page: response.data.per_page,
        total: response.data.total,
        pages: response.data.pages,
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      ElMessage.error(`${t('session.loadFailed')}: ${error.message}`)
    } finally {
      loading.value = false
    }
  }

  const handlePageChange = (page) => {
    pagination.value.page = page
    fetchSessions()
  }

  const handlePageSizeChange = (size) => {
    pagination.value.per_page = size
    pagination.value.page = 1
    fetchSessions()
  }

  const handleSortChange = () => {
    pagination.value.page = 1
    fetchSessions()
  }

  const createNewSession = async (customTitle = null) => {
    try {
      loading.value = true
      const defaultSessionData = {
        title: customTitle || `${t('session.newSessionDefault')} ${sessions.value.length + 1}`,
        description: '',
        user_code: {
          lang: 'cpp',
          std: 'c++17',
          content: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}`,
        },
        std_code: {
          lang: 'cpp',
          std: 'c++17',
          content: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Standard solution\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}`,
        },
        gen_code: {
          lang: 'cpp',
          std: 'c++17',
          content: `#include <iostream>\n#include <random>\nusing namespace std;\n\nint main() {\n    random_device rd;\n    mt19937 gen(rd());\n    uniform_int_distribution<> dis(1, 100);\n    \n    int a = dis(gen);\n    int b = dis(gen);\n    cout << a << " " << b << endl;\n    return 0;\n}`,
        },
      }

      const response = await createSession(defaultSessionData)

      if (response.data && response.data.id) {
        const newSession = response.data
        sessions.value.unshift(newSession)
        ElMessage.success(t('session.createSuccess'))
        router.push(`/sessions/${newSession.id}`)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Create session error:', error)
      let errorMessage = t('common.error')

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication required.'
          authStore.logout()
          router.push('/login')
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid session data'
        } else {
          errorMessage = `Server error (${error.response.status})`
        }
      } else if (error.request) {
        errorMessage = 'Network error.'
      } else {
        errorMessage = error.message || 'Unknown error'
      }

      ElMessage.error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  const handleTitleUpdated = ({ id, title }) => {
    const session = sessions.value.find((s) => s.id === id)
    if (session) session.title = title
  }

  const handleSessionDeleted = ({ id }) => {
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  return {
    sessions,
    loading,
    pagination,
    sortConfig,
    sortOptions,
    sortOrderOptions,
    fetchSessions,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    createNewSession,
    handleTitleUpdated,
    handleSessionDeleted,
  }
}
