import { authApi } from './request'

export const getUsers = (params) => {
  return authApi.get('/admin/users', { params })
}

export const updateUser = (userId, data) => {
  return authApi.put(`/admin/users/${userId}`, data)
}
