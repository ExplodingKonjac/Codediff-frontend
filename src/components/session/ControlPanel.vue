<script setup>
import {
  Refresh as RefreshIcon,
  Close as CloseIcon,
  VideoPlay as VideoPlayIcon,
} from '@element-plus/icons-vue'

const props = defineProps({
  maxTests: {
    type: Number,
    required: true,
  },
  selectedChecker: {
    type: String,
    required: true,
  },
  checkerOptions: {
    type: Array,
    required: true,
  },
  currentStatus: {
    type: String,
    required: true,
  },
  isGenerating: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasTestCases: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:maxTests', 'update:selectedChecker', 'start', 'stop', 'rerun'])
</script>

<template>
  <div class="action-buttons">
    <div class="mb-4">
      <div class="flex justify-between text-sm mb-1 font-medium">
        <span>Current status: {{ currentStatus }}</span>
      </div>
    </div>

    <!-- Max Tests and Checker Controller -->
    <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div class="flex flex-col gap-3">
        <!-- Max Tests -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <label class="text-sm font-medium text-gray-700 min-w-[80px]">Max Tests</label>
          <el-input-number
            :model-value="maxTests"
            @update:model-value="$emit('update:maxTests', $event)"
            :min="1"
            :max="1000"
            placeholder="Max tests to generate"
            class="w-full sm:w-auto flex-1"
          />
          <p class="text-xs text-gray-500 sm:text-right">Tests to generate (1-1000)</p>
        </div>

        <!-- Checker Selector -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <label class="text-sm font-medium text-gray-700 min-w-[80px]">Checker</label>
          <div class="w-full sm:w-auto flex-1">
            <el-select
              :model-value="selectedChecker"
              @update:model-value="$emit('update:selectedChecker', $event)"
              placeholder="Select checker"
              class="w-full"
              :filterable="true"
            >
              <el-option
                v-for="checker in checkerOptions"
                :key="checker.value"
                :label="checker.label"
                :value="checker.value"
              >
                <el-popover trigger="hover" :content="checker.description" placement="right">
                  <template #reference>
                    <div class="flex justify-between items-center">
                      {{ checker.label }}
                    </div>
                  </template>
                </el-popover>
              </el-option>
            </el-select>
          </div>
          <p class="text-xs text-gray-500 mt-1">Checker to judge outputs</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-3">
      <el-button
        v-if="!isGenerating"
        type="primary"
        size="large"
        @click="$emit('start')"
        :disabled="loading"
        class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
        :icon="RefreshIcon"
      >
        <span>Continuous Diff</span>
      </el-button>

      <el-button
        v-if="isGenerating"
        type="danger"
        size="large"
        @click="$emit('stop')"
        class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
        :icon="CloseIcon"
      >
        <span>Stop Diff</span>
      </el-button>

      <el-button
        type="warning"
        size="large"
        @click="$emit('rerun')"
        :disabled="loading || !hasTestCases"
        class="flex-1 px-4 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
        :icon="VideoPlayIcon"
      >
        <span>Rerun Tests</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
/* Action Buttons */
.action-buttons {
  flex-shrink: 0;
  padding: 16px 0;
  border-top: 1px solid #e2e8f0;
  margin-top: auto;
}

@media (max-width: 1024px) {
  .action-buttons {
    position: sticky;
    bottom: 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  }
}

:deep(.el-select .el-input__wrapper),
:deep(.el-input-number .el-input__wrapper) {
  border-radius: 6px !important;
}

:deep(.el-select-dropdown__item) {
  padding: 12px 16px !important;
}
</style>
