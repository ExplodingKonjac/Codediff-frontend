import { authApi } from './request'

export const login = (credentials) => {
  return authApi.post('/auth/login', credentials)
}

export const sendVerificationCode = (email) => {
  return authApi.post('/auth/send-code', { email })
}

export const register = (userData) => {
  return authApi.post('/auth/register', userData)
}

export const logout = () => {
  return authApi.post('/auth/logout')
}

export const getUserProfile = () => {
  return authApi.get('/auth/me')
}

export const updateUserProfile = (updates) => {
  return authApi.put('/auth/me', updates)
}