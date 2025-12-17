<script setup>
import { ref, onMounted, reactive } from 'vue'
import { getUsers, updateUser } from '@/api/admin'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { Search, Edit, UserFilled } from '@element-plus/icons-vue'

const authStore = useAuthStore()
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const loading = ref(false)
const users = ref([])
const total = ref(0)
const query = reactive({
  page: 1,
  per_page: 10,
  search: '',
  sort: 'id',
  order: 'asc',
})

const dialogVisible = ref(false)
const editingUser = ref(null)
const editForm = ref({
  role: '',
  password: '',
})
const saving = ref(false)

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({
      page: query.page,
      per_page: query.per_page,
      search: query.search,
      sort: query.sort,
      order: query.order,
    })
    users.value = res.data.users
    total.value = res.data.total
    query.page = res.data.page // sync back from server if needed
  } catch (err) {
    ElMessage.error(err.message || t('admin.fetchFailed'))
  } finally {
    loading.value = false
  }
}

const handleEdit = (user) => {
  editingUser.value = user
  editForm.value.role = user.role
  editForm.value.password = ''
  dialogVisible.value = true
}

const handleSave = async () => {
  saving.value = true
  try {
    const userId = editingUser.value.id
    const updates = {}

    // Only send changed fields and valid fields for current user role
    if (authStore.isRoot && editForm.value.role !== editingUser.value.role) {
      updates.role = editForm.value.role
    }

    if (editForm.value.password) {
      updates.password = editForm.value.password
    }

    if (Object.keys(updates).length === 0) {
      dialogVisible.value = false
      return
    }

    await updateUser(userId, updates)
    ElMessage.success(t('admin.updateSuccess'))
    dialogVisible.value = false
    fetchUsers()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || err.message || t('common.error'))
  } finally {
    saving.value = false
  }
}

const handleSearch = () => {
  query.page = 1
  fetchUsers()
}

const handlePageChange = (page) => {
  query.page = page
  fetchUsers()
}

const roleTagType = (role) => {
  if (role === 'root') return 'danger'
  if (role === 'admin') return 'warning'
  return 'info'
}

const handleSortChange = ({ prop, order }) => {
  if (!order) {
    query.sort = 'created_at'
    query.order = 'desc'
  } else {
    query.sort = prop
    query.order = order === 'ascending' ? 'asc' : 'desc'
  }
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <el-icon><UserFilled /></el-icon>
        {{ t('admin.title') }}
      </h1>

      <div class="flex gap-2 w-full md:w-auto">
        <el-input
          v-model="query.search"
          :placeholder="t('admin.searchPlaceholder')"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">{{ t('common.search') }}</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table
        :data="users"
        v-loading="loading"
        stripe
        border
        @sort-change="handleSortChange"
        :default-sort="{ prop: 'created_at', order: 'descending' }"
      >
        <el-table-column prop="id" :label="t('common.id')" width="80" sortable="custom" />
        <el-table-column prop="username" :label="t('common.username')" sortable="custom" />
        <el-table-column prop="email" :label="t('common.email')" sortable="custom" />
        <el-table-column prop="role" :label="t('common.role')" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small" class="capitalize">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          :label="t('common.createdAt')"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="Edit"
              @click="handleEdit(row)"
              :disabled="
                row.id === authStore.userId ||
                (authStore.user.role === 'admin' && ['admin', 'root'].includes(row.role))
              "
            >
              {{ t('common.edit') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.per_page"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="t('admin.editUser')" width="400px">
      <el-form :model="editForm" label-position="top">
        <el-form-item :label="t('common.role')" v-if="authStore.isRoot">
          <el-select v-model="editForm.role" class="w-full">
            <el-option label="User" value="user" />
            <el-option label="Admin" value="admin" />
            <el-option label="Root" value="root" disabled />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('admin.resetPassword')">
          <el-input
            v-model="editForm.password"
            :placeholder="t('admin.leaveEmpty')"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">{{
            t('common.save')
          }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
