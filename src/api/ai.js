import { api } from './request'

export const generateCode = (type, sessionId) => {
  return api.post('/ai/generate', { 
    type, 
    session_id: sessionId 
  })
}

export const ocr = (image) => {
  const formData = new FormData()
  formData.append('image', image)

  return api.post('/ai/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
