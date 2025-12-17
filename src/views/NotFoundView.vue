<script setup>
import { useRouter } from 'vue-router'
import { House as HouseIcon, ArrowLeftBold as ArrowLeftBoldIcon } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4"
  >
    <div class="text-center max-w-md">
      <div class="text-9xl font-bold text-blue-500 mb-4">404</div>
      <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{{ t('notFound.title') }}</h1>
      <p class="text-lg text-gray-600 mb-8">
        {{ t('notFound.message') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <el-button
          type="primary"
          size="large"
          @click="goHome"
          class="flex items-center gap-2 px-6 py-3"
          :icon="HouseIcon"
        >
          <span>{{ t('notFound.goHome') }}</span>
        </el-button>

        <el-button
          size="large"
          @click="router.back()"
          class="flex items-center gap-2 px-6 py-3"
          :icon="ArrowLeftBoldIcon"
        >
          <span>{{ t('notFound.goBack') }}</span>
        </el-button>
      </div>

      <div class="mt-12">
        <div
          class="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <img src="/logo.png" alt="CodeDiff Logo" class="h-12 w-auto" />
        </div>
        <p class="text-gray-500">CodeDiff - Program Verification Assistant</p>
      </div>
    </div>
  </div>
</template>
