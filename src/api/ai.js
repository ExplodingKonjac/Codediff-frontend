import { api } from './request'

export const generateCode = (type, sessionId) => {
  return api.post('/ai/generate', { 
    type, 
    session_id: sessionId 
  })
}