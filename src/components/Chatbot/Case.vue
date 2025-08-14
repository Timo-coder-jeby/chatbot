<script setup lang="ts">
import { ref, inject } from 'vue'
import { SearchOutlined, FileSearchOutlined } from '@ant-design/icons-vue'
import { type IAIService } from '@/services/aiService.ts'

const aiService = inject<IAIService>('aiService')!

// Props定义
type Props = {
  curMenuItem: {
    key: string
    title: string
    type: string
    apiBase: string
  }
}

const props = defineProps<Props>()

// 搜索相关状态
const searchValue = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)

// 执行搜索
const handleSearch = async () => {
  if (!searchValue.value.trim()) return

  isSearching.value = true
  try {
    // 根据当前菜单类型调用不同的API
    const response = await aiService.post(props.curMenuItem.apiBase, {
      query: searchValue.value,
      // 可以根据需要添加其他参数
    })

    searchResults.value = response.results || response.data || []
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 清空搜索
const clearSearch = () => {
  searchValue.value = ''
  searchResults.value = []
}
</script>

<template>
  <div class="flex flex-col h-full bg-gradient-to-br from-red-50 to-rose-100">
    <!-- 搜索区域 -->
    <div class="p-6 bg-white/90 border-b border-red-100 backdrop-blur-sm">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
          <component :is="curMenuItem.type === 'law' ? SearchOutlined : FileSearchOutlined" class="text-xl text-white" />
        </div>
        <h2 class="text-xl font-semibold text-slate-700 m-0">{{ curMenuItem.title }}</h2>
        <div class="ml-auto flex items-center space-x-1">
          <div class="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
          <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse delay-75"></div>
          <div class="w-2 h-2 rounded-full bg-red-600 animate-pulse delay-150"></div>
        </div>
      </div>

      <div class="max-w-2xl">
        <a-input-search
          v-model:value="searchValue"
          :placeholder="`请输入要搜索的${curMenuItem.type === 'law' ? '法律条文' : '案例'}关键词`"
          size="large"
          enter-button="搜索"
          :loading="isSearching"
          @search="handleSearch"
          @clear="clearSearch"
          allow-clear
          class="!rounded-xl [&_.ant-input]:!border-2 [&_.ant-input]:!border-red-100 [&_.ant-input]:!text-base [&_.ant-input]:!px-4 [&_.ant-input]:!py-3 [&_.ant-input:focus]:!border-red-500 [&_.ant-input:focus]:!shadow-lg [&_.ant-input:focus]:!shadow-red-100 [&_.ant-btn]:!rounded-r-xl [&_.ant-btn]:!bg-red-500 [&_.ant-btn]:!border-red-500 [&_.ant-btn]:!h-12 [&_.ant-btn]:!px-6 [&_.ant-btn]:!font-semibold [&_.ant-btn:hover]:!bg-red-600"
        />
      </div>
    </div>

    <!-- 搜索结果区域 -->
    <div class="flex-1 p-6 overflow-y-auto">
      <!-- 加载状态 -->
      <div v-if="isSearching" class="flex flex-col items-center justify-center h-48">
        <div class="relative">
          <a-spin size="large" />
          <div class="absolute -inset-2 rounded-full bg-red-400/20 animate-ping"></div>
        </div>
        <div class="mt-4 text-slate-600 text-base font-medium">正在搜索中...</div>
        <div class="text-sm text-red-500 mt-1">智能检索法律数据库</div>
      </div>

      <!-- 搜索结果列表 -->
      <div v-else-if="searchResults.length > 0" class="space-y-4">
        <div class="mb-5 pb-3 border-b border-red-100 bg-gradient-to-r from-red-50 to-transparent rounded-lg p-3">
          <span class="text-sm font-medium text-slate-600">共找到 </span>
          <span class="text-lg font-bold text-red-600">{{ searchResults.length }}</span>
          <span class="text-sm font-medium text-slate-600"> 条相关结果</span>
          <div class="text-xs text-red-500 mt-1">数据来源：法律法规数据库</div>
        </div>

        <div class="space-y-4">
          <div
            v-for="(result, index) in searchResults"
            :key="index"
            class="group bg-white/90 border border-red-100 rounded-xl p-5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/50 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm relative overflow-hidden"
          >
            <!-- 装饰性边框 -->
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-red-600 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div class="text-base font-semibold text-slate-700 mb-2 leading-6 group-hover:text-red-700 transition-colors">
              {{ result.title || result.name || `结果 ${index + 1}` }}
            </div>
            <div class="text-slate-600 leading-7 mb-3">
              {{ result.content || result.description || result.summary }}
            </div>
            <div class="flex gap-4 text-xs text-slate-400">
              <span v-if="result.source" class="bg-red-50 text-red-600 px-2 py-1 rounded-md">来源: {{ result.source }}</span>
              <span v-if="result.date" class="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">时间: {{ result.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="searchValue && !isSearching" class="flex flex-col items-center justify-center h-72 text-center">
        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mb-4">
          <SearchOutlined class="text-3xl text-red-500" />
        </div>
        <div class="text-lg font-medium text-slate-600 mb-2">未找到相关结果</div>
        <div class="text-slate-400 text-sm">请尝试使用其他关键词搜索</div>
        <div class="text-xs text-red-500 mt-2">建议：使用法条号、案件关键词或当事人姓名</div>
      </div>

      <!-- 初始状态 -->
      <div v-else class="flex flex-col items-center justify-center h-72 text-center">
        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mb-4 shadow-lg animate-glow">
          <component :is="curMenuItem.type === 'law' ? SearchOutlined : FileSearchOutlined" class="text-4xl text-red-500" />
        </div>
        <div class="text-xl font-semibold text-slate-700 mb-2">{{ curMenuItem.title }}</div>
        <div class="text-slate-500 text-sm mb-4">输入关键词开始智能检索</div>
        <div class="flex items-center space-x-2 text-xs text-red-500">
          <div class="w-1 h-1 rounded-full bg-red-400 animate-pulse"></div>
          <span>专业法律数据库</span>
          <div class="w-1 h-1 rounded-full bg-red-400 animate-pulse"></div>
          <span>智能语义检索</span>
          <div class="w-1 h-1 rounded-full bg-red-400 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
</template>
