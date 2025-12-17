<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  SuccessFilled as SuccessFilledIcon,
  CloseBold as CloseBoldIcon,
  Reading as ReadingIcon,
  Timer as TimerIcon,
  Document as DocumentIcon,
  Refresh as RefreshIcon,
  CircleCheck as CircleCheckIcon,
  CircleClose as CircleCloseIcon,
  ArrowDownBold as ArrowDownBoldIcon,
  InfoFilled as InfoFilledIcon,
  Select as SelectIcon,
} from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  testcase: {
    type: Object,
    required: true,
  },
  isExpanded: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])

const expanded = ref(props.isExpanded)
const statusConfig = computed(() => {
  const status = props.testcase.status || 'PENDING'

  const configs = {
    OK: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      thinBorderColor: 'border-green-100',
      icon: SelectIcon,
      label: 'Accepted',
    },
    WA: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      thinBorderColor: 'border-green-100',
      icon: CloseBoldIcon,
      label: 'Wrong Answer',
    },
    RE: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      thinBorderColor: 'border-green-100',
      icon: CloseBoldIcon,
      label: 'Runtime Error',
    },
    TLE: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      thinBorderColor: 'border-green-100',
      icon: TimerIcon,
      label: 'Time Limit Exceeded',
    },
    KILLED: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      thinBorderColor: 'border-green-100',
      icon: CloseBoldIcon,
      label: 'Killed (TLE or MLE)',
    },
    OLE: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      thinBorderColor: 'border-green-100',
      icon: DocumentIcon,
      label: 'Output Limit Exceeded',
    },
    UKE: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      thinBorderColor: 'border-green-100',
      icon: CircleCloseIcon,
      label: 'Unknown Error',
    },
    PENDING: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      thinBorderColor: 'border-green-100',
      icon: RefreshIcon,
      label: 'Pending',
    },
  }

  return configs[status.split(' ').at(-1)] || configs['PENDING']
})

const toggleExpand = () => {
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
}

// 阻止内容区域点击冒泡
const handleContentClick = (event) => {
  event.stopPropagation()
}
</script>

<template>
  <div
    class="mb-4 cursor-default transition-all duration-300 overflow-hidden rounded-xl border"
    style="padding: 0"
    :class="statusConfig.borderColor"
  >
    <!-- 头部 - 可点击区域 -->
    <div
      class="header-section p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors"
      @click="toggleExpand"
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="flex-shrink-0">
            <el-avatar :size="32" :class="`${statusConfig.bgColor} ${statusConfig.color}`">
              <el-icon size="20"><component :is="statusConfig.icon" /></el-icon>
            </el-avatar>
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-800 truncate text-lg" :title="testcase.input">
              {{ testcase.input || t('testcase.noInput') }}
            </div>
            <div class="flex items-center gap-2 mt-1 text-sm">
              <span class="font-medium font-mono" :class="statusConfig.color">{{
                statusConfig.label
              }}</span>
              <span class="text-gray-400">•</span>
              <span class="text-gray-500 flex items-center gap-1">
                <el-icon size="14"><TimerIcon /></el-icon>
                {{ testcase.time_used != null ? testcase.time_used + 'ms' : 'N/A' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex-shrink-0 flex items-center gap-3">
          <div class="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            #{{ testcase.id }}
          </div>
          <el-icon
            :size="18"
            class="text-gray-500 transition-transform duration-300"
            :style="{ transform: expanded ? 'rotate(180deg)' : 'none' }"
          >
            <ArrowDownBoldIcon />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 内容区域 - 平滑展开/收回 -->
    <transition name="slide-fade">
      <div v-if="expanded" class="content-section p-4 bg-gray-50" @click.stop="handleContentClick">
        <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
          <!-- Status Details -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100">
              <el-icon size="18" class="text-gray-600"><DocumentIcon /></el-icon>
              <span class="font-medium text-gray-700">{{ t('testcase.statusDetails') }}</span>
            </div>
            <div class="p-3 space-y-2">
              <div class="flex items-start gap-2">
                <el-icon size="16" class="mt-0.5 text-blue-600"><CircleCheckIcon /></el-icon>
                <div>
                  <span class="text-sm text-gray-500">{{ t('testcase.status') }}</span>
                  <span class="ml-2 font-medium" :class="statusConfig.color">{{
                    statusConfig.label
                  }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <el-icon size="16" class="mt-0.5 text-gray-600"><InfoFilledIcon /></el-icon>
                <div>
                  <span class="text-sm text-gray-500">{{ t('testcase.judgement') }}</span>
                  <span class="ml-2 font-medium text-gray-600">{{
                    testcase.detail != null ? testcase.detail : 'N/A'
                  }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <el-icon size="16" class="mt-0.5 text-blue-600"><TimerIcon /></el-icon>
                <div>
                  <span class="text-sm text-gray-500">{{ t('testcase.userTime') }}</span>
                  <span class="ml-2 font-medium">{{
                    testcase.time_used != null ? testcase.time_used.toFixed(2) + 'ms' : 'N/A'
                  }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <el-icon size="16" class="mt-0.5 text-purple-600"><DocumentIcon /></el-icon>
                <div>
                  <span class="text-sm text-gray-500">{{ t('testcase.memory') }}</span>
                  <span class="ml-2 font-medium">{{
                    testcase.memory_used != null ? testcase.memory_used.toFixed(2) + 'MB' : 'N/A'
                  }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <el-icon size="16" class="mt-0.5 text-gray-600"><RefreshIcon /></el-icon>
                <div>
                  <span class="text-sm text-gray-500">{{ t('testcase.created') }}</span>
                  <span class="ml-2 font-medium text-gray-600">{{
                    formatDate(testcase.created_at)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Data -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100">
              <el-icon size="18" class="text-blue-600"><ReadingIcon /></el-icon>
              <span class="font-medium text-gray-700">{{ t('testcase.inputData') }}</span>
            </div>
            <div
              class="p-3 max-h-48 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-gray-700"
            >
              <div v-if="testcase.input">{{ testcase.input }}</div>
              <div v-else class="text-gray-400 italic">{{ t('testcase.noInputAvailable') }}</div>
            </div>
          </div>

          <!-- User Output -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div
              class="flex items-center gap-2 p-3 border-b"
              :class="`${statusConfig.bgColor} ${statusConfig.thinBorderColor}`"
            >
              <el-icon size="18" class="text-red-600"
                ><component :is="statusConfig.icon"
              /></el-icon>
              <span class="font-medium text-gray-700">{{ t('testcase.userOutput') }}</span>
            </div>
            <div
              class="p-3 max-h-48 overflow-y-auto font-mono text-sm whitespace-pre-wrap"
              :class="`${statusConfig.bgColor} ${statusConfig.color}`"
            >
              <div v-if="testcase.output">{{ testcase.output }}</div>
              <div v-else class="text-gray-400 italic">{{ t('testcase.noOutput') }}</div>
            </div>
          </div>

          <!-- Standard Output -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="flex items-center gap-2 p-3 bg-green-50 border-b border-green-100">
              <el-icon size="18" class="text-green-600"><SelectIcon /></el-icon>
              <span class="font-medium text-gray-700">{{ t('testcase.standardOutput') }}</span>
            </div>
            <div
              class="p-3 max-h-48 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-green-700 bg-green-50"
            >
              <div v-if="testcase.answer">{{ testcase.answer }}</div>
              <div v-else class="text-gray-400 italic">{{ t('testcase.noAnswer') }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 移除外部 padding */
.el-card :deep(.el-card__body) {
  padding: 0 !important;
}

/* 内容样式调整 - 缩小字体并移除 padding */
.content-section {
  font-size: 0.95rem !important;
}

.content-section .font-mono {
  font-size: 0.9rem !important;
}

.content-section .text-sm {
  font-size: 0.85rem !important;
}

/* 内部卡片样式 */
.content-section :deep(.bg-white) {
  border-radius: 12px !important;
  font-size: 0.95rem !important;
}

.content-section :deep(.bg-white > div:first-child) {
  padding: 8px 10px !important;
  font-size: 0.9rem !important;
}

/* 标签和值样式 */
.content-section :deep(.text-sm) {
  font-size: 0.85rem !important;
}

.content-section :deep(.font-medium) {
  font-size: 0.9rem !important;
}

/* 滚动区域字体 */
.content-section :deep(.max-h-48) {
  font-size: 0.9rem !important;
}

/* 过渡动画保持不变 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
