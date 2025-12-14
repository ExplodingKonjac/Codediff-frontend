import { api } from './request'

export const getSessions = (params = {}) => {
  return api.get('/sessions', { params })
}

export const getSessionById = (id) => {
  return api.get(`/sessions/${id}`)
}

export const createSession = (sessionData) => {
  // 关键修复：确保所有内容都是字符串
  const payload = {
    title: String(sessionData.title),
    description: String(sessionData.description),
    user_code: {
      lang: String(sessionData.user_code.lang),
      std: String(sessionData.user_code.std),
      content: String(sessionData.user_code.content || ''),
    },
    std_code: {
      lang: String(sessionData.std_code.lang),
      std: String(sessionData.std_code.std),
      content: String(sessionData.std_code.content || ''),
    },
  }

  // 可选字段
  if (sessionData.gen_code && sessionData.gen_code.content) {
    payload.gen_code = {
      lang: String(sessionData.gen_code.lang),
      std: String(sessionData.gen_code.std),
      content: String(sessionData.gen_code.content),
    }
  }

  console.log('Creating session with payload:', payload)

  return api.post('/sessions', payload)
}

export const updateSession = (id, updates) => {
  return api.put(`/sessions/${id}`, updates)
}

export const deleteSession = (id) => {
  return api.delete(`/sessions/${id}`)
}
