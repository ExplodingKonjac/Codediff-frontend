import { api } from './request'

export const rerunExistingTests = (sessionId, caseIds = []) => {
  return api.post(`/diff/${sessionId}/rerun`, { case_ids: caseIds })
}

export const stopContinuousDiff = (sessionId) => {
  return api.post(`/diff/${sessionId}/stop`)
}