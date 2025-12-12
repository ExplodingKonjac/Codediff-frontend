import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/request'
import router from '@/router/index'
import { ElMessage } from 'element-plus'
import { sendVerificationCode as sendCodeApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // token: localStorage.getItem('token') || '', // No longer used
    user: JSON.parse(localStorage.getItem('user')) || null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    username: (state) => state.user?.username || 'Guest',
    userId: (state) => state.user?.id,
    aiModel: (state) => state.user?.ai_model || ''
  },
  
  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authApi.post('/auth/login', credentials)
        
        // 确保从响应中正确获取数据
        const data = response.data
        
        // this.token = data.access_token // No token
        this.user = data.user
        
        // 保存到本地存储
        // localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        
        ElMessage.success(`Welcome back, ${this.username}!`)
        return true
      } catch (error) {
        // 更好的错误处理
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error?.message ||
                            error.message || 'Login failed'
        this.error = errorMessage
        ElMessage.error(`Login failed: ${errorMessage}`)
        return false
      } finally {
        this.loading = false
      }
    },
    
    async register(userData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authApi.post('/auth/register', userData)
        
        const data = response.data
        
        // this.token = data.access_token
        this.user = data.user
        
        // localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        
        ElMessage.success(`Registration successful, ${this.username}!`)
        return true
      } catch (error) {
        // 更好的错误处理
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error?.message ||
                            error.message || 'Registration failed'
        this.error = errorMessage
        ElMessage.error(`Registration failed: ${errorMessage}`)
        return false
      } finally {
        this.loading = false
      }
    },

    async sendVerificationCode(email) {
      try {
        await sendCodeApi(email)
        ElMessage.success('Verification code sent! Please check your email (or server console in development)')
        return true
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to send code'
        ElMessage.error(errorMessage)
        return false
      }
    },
    
    async fetchUserProfile() {
      try {
        const response = await authApi.get('/auth/me')
        this.user = response.data
        
        // 确保保存 ai_model 字段
        if (!this.user.ai_model) {
          this.user.ai_model = ''
        }
        
        localStorage.setItem('user', JSON.stringify(this.user))
        return this.user
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        this.logout()
        return null
      }
    },
    
    async updateUserProfile(updates) {
      try {
        // 确保保存 ai_model
        if (updates.ai_model === undefined && this.user?.ai_model) {
          updates.ai_model = this.user.ai_model
        }
        
        const response = await authApi.put('/auth/me', updates)
        this.user = response.data
        localStorage.setItem('user', JSON.stringify(this.user))
        ElMessage.success('Profile updated successfully')
        return true
      } catch (error) {
        ElMessage.error(`Update failed: ${error.message}`)
        return false
      }
    },
    
    logout() {
      // this.token = ''
      this.user = null
      // localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // 重定向到登录页    
      // if (route.path !== '/login') {
        ElMessage.info('You have been logged out')
        router.push('/login')
      // }
    }
  }
})