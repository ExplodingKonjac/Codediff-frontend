import { ref, toRaw } from 'vue'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

export function useAI(session, sessionId, markUnsaved) {
  const aiStreaming = ref({
    generator: { loading: false, content: '', complete: false },
    standard: { loading: false, content: '', complete: false },
  })

  const aiSSEClient = {
    generator: null,
    standard: null,
  }

  const generateCodeStreaming = async (type, editor) => {
    if (!session.value || !sessionId.value) {
      ElMessage.warning('Session not loaded')
      return
    }

    aiStreaming.value[type] = { loading: true, content: '', complete: false }

    try {
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '')
      let sseUrl = new URL(`${baseUrl}/ai/stream-generate`)
      sseUrl.searchParams.set('type', type)
      sseUrl.searchParams.set('session_id', sessionId.value)

      aiSSEClient[type] = new EventSourcePolyfill(sseUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        heartbeatTimeout: 30000,
        connectionTimeout: 10000,
      })

      aiSSEClient[type].addEventListener('chunk', (event) => {
        try {
          const data = JSON.parse(event.data)
          aiStreaming.value[type].content += data.content

          // Update session incrementally to trigger watchers in UI
          const key = type === 'generator' ? 'gen_code' : 'std_code'
          if (!session.value[key]) {
            session.value[key] = { lang: 'cpp', std: 'c++17', content: '' }
          }
          session.value[key].content = aiStreaming.value[type].content
        } catch (e) {
          console.error(e)
        }
      })

      aiSSEClient[type].addEventListener('finish', () => {
        ElMessage.success(
          `${type === 'generator' ? 'Generator' : 'Standard'} code generated successfully!`,
        )

        const key = type === 'generator' ? 'gen_code' : 'std_code'
        if (!session.value[key]) {
          session.value[key] = { lang: 'cpp', std: 'c++17', content: '' }
        }
        session.value[key].content = aiStreaming.value[type].content
        markUnsaved()

        aiStreaming.value[type].loading = false
        aiStreaming.value[type].complete = true

        if (aiSSEClient[type]) {
          aiSSEClient[type].close()
          aiSSEClient[type] = null
        }
      })

      aiSSEClient[type].onerror = (error) => {
        console.error('AI SSE error:', error)
        ElMessage.error('AI Generation failed')
        aiStreaming.value[type].loading = false
        if (aiSSEClient[type]) {
          aiSSEClient[type].close()
          aiSSEClient[type] = null
        }
      }
    } catch (error) {
      console.error('AI Generation setup error:', error)
      ElMessage.error(`Failed to start AI generation: ${error.message}`)
      aiStreaming.value[type].loading = false
    }
  }

  const cleanupAI = () => {
    Object.values(aiSSEClient).forEach((client) => {
      if (client) client.close()
    })
  }

  return {
    aiStreaming,
    generateCodeStreaming,
    cleanupAI,
  }
}
