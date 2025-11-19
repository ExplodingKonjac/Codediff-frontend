import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// 创建两个不同的 axios 实例
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: import.meta.env.DEV ? false : true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export const authApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 普通请求拦截器
api.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 认证请求拦截器（用于登录/注册等）
authApi.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    if (authStore.token && !config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器（两个实例共享）
const setupResponseInterceptors = (instance) => {
  instance.interceptors.response.use(
    response => response,
    error => {
      const authStore = useAuthStore()
      
      if (error.response) {
        // 令牌过期
        if (error.response.status === 401 && authStore.isAuthenticated) {
          authStore.logout()
          router.push('/login')
          return Promise.reject(new Error('Session expired. Please login again.'))
        }
        
        // 错误处理
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error?.message ||
                            error.message
        return Promise.reject(new Error(errorMessage))
      }
      
      // 网络错误
      if (!error.response && error.message.includes('Network Error')) {
        return Promise.reject(new Error('Network error. Please check your connection.'))
      }
      
      return Promise.reject(error)
    }
  )
}

// 为两个实例设置响应拦截器
setupResponseInterceptors(api)
setupResponseInterceptors(authApi)

// 导出一个统一的 API 对象，方便调试
export const apiClient = {
  api,
  authApi,
  // 调试方法
  debugRequest: async (url, method = 'GET', data = null) => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: data ? JSON.stringify(data) : null
      })
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      }
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        result.data = await response.json()
      } else {
        result.data = await response.text()
      }
      
      return result
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack
      }
    }
  }
}