import { api } from './request'

export const startContinuousDiff = (sessionId, config = {}) => {
  // 由于 SSE 使用 EventSource，这个方法可能不再需要
  // 保留以备将来使用
  return api.get(`/diff/${sessionId}/start`, {
    params: {
      max_tests: config.max_tests || 100
    }
  })
}

export const rerunExistingTests = (sessionId, caseIds = []) => {
  return api.post(`/diff/${sessionId}/rerun`, { case_ids: caseIds })
}

export const stopContinuousDiff = (sessionId) => {
  return api.post(`/diff/${sessionId}/stop`)
}