<script setup lang="ts">
import { ref, inject, computed, watch } from 'vue'
import { SearchOutlined, FileSearchOutlined, DownOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { type IAIService } from '@/services/aiService.ts'

const aiService = inject<IAIService>('aiService')!

// Props定义
type Props = {
  curMenuItem: {
    key: string
    title: string
    type: string
    apiBase: string
    apiType: string
  }
  conversationList: any[]
  activeConversationKey: string
  currentMessages: any[]
}

const props = defineProps<Props>()

// Emits定义
const emit = defineEmits<{
  'send-message': [message: string]
}>()

// 搜索相关状态
const searchValue = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

// 建议词条
const suggestedTerms = computed(() => {
  if (props.curMenuItem.type === 'law') {
    return [
      '劳动合同法',
      '刑法修正案',
      '民事诉讼法',
      '知识产权法',
      '公司法条例',
      '婚姻法规定'
    ]
  } else {
    return [
      '合同纠纷案例',
      '交通事故赔偿',
      '劳动争议案件',
      '房产纠纷判决',
      '知识产权侵权',
      '刑事辩护案例'
    ]
  }
})

// 计算是否为新会话
const isNewConversation = computed(() => {
  return props.activeConversationKey.startsWith('conv-')
})

// 计算当前会话
const currentConversation = computed(() => {
  return props.conversationList.find(item => item.key === props.activeConversationKey)
})

// 加载历史会话的搜索结果
const loadHistoryResults = async () => {
  if (!currentConversation.value?.sessionKey) return

  isSearching.value = true
  try {
    // 直接调用搜索接口获取历史结果
    const response = await aiService.get(`/chat/session/messages/${props.activeConversationKey}/${props?.curMenuItem?.type}`)
    searchResults.value = response?.results || response?.data || []
  } catch (error) {
    console.error('加载历史搜索结果失败:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 监听会话变化，如果是历史会话则加载搜索结果
watch(() => props.activeConversationKey, async () => {
  if (!isNewConversation.value && currentConversation.value?.sessionKey) {
    await loadHistoryResults()
  } else {
    searchResults.value = []
  }
}, { immediate: true })

// 执行搜索
const handleSearch = async () => {
  if (!searchValue.value.trim()) return

  // 如果是新会话，使用 handleSendMessage 获取 sessionId
  if (isNewConversation.value) {
    emit('send-message', searchValue.value)
    searchValue.value = ''
    return
  }

  // 如果是历史会话，直接搜索
  await performSearch()
}

// 执行实际搜索
const performSearch = async () => {
  if (!currentConversation.value?.sessionKey) return

  isSearching.value = true
  try {
    let response

    // 根据 apiType 选择调用方式
    if (props.curMenuItem.apiType === 'stream') {
      // 流式接口
      response = await aiService.sendMessageStream(
        props.curMenuItem.apiBase,
        {
          sessionId: currentConversation.value.sessionKey,
          question: searchValue.value
        }
      )
    } else {
      // ajax 接口
      response = await aiService.post(props.curMenuItem.apiBase, {
        sessionId: currentConversation.value.sessionKey,
        question: searchValue.value
      })
    }

    searchResults.value = response?.results || response?.data || []
    message.success(`找到 ${searchResults.value.length} 条相关结果`)

  } catch (error) {
    console.error('搜索失败:', error)
    message.error('搜索失败，请稍后重试')
    searchResults.value = []
  } finally {
    isSearching.value = false
    searchValue.value = ''
  }
}

// 点击建议词条进行搜索
const handleSuggestedSearch = (term: string) => {
  searchValue.value = term
  handleSearch()
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <!-- 头部 -->
    <div class="flex-shrink-0 p-6 bg-white border-b border-gray-200">
      <div class="flex items-center gap-4">
        <a-avatar :size="40" class="bg-red-500">
          <template #icon>
            <component :is="curMenuItem.type === 'law' ? SearchOutlined : FileSearchOutlined" />
          </template>
        </a-avatar>
        <div>
          <h2 class="text-xl font-semibold text-gray-800 m-0">{{ curMenuItem.title }}</h2>
          <p class="text-sm text-gray-500 m-0">智能检索系统</p>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 overflow-hidden">
      <!-- 新会话：显示搜索框 -->
      <div v-if="isNewConversation" class="flex items-center justify-center h-full p-8">
        <div class="w-full max-w-2xl text-center">
          <a-avatar :size="80" class="bg-red-500 mb-6">
            <template #icon>
              <component :is="curMenuItem.type === 'law' ? SearchOutlined : FileSearchOutlined" class="text-3xl" />
            </template>
          </a-avatar>

          <h3 class="text-2xl font-bold text-gray-800 mb-2">{{ curMenuItem.title }}</h3>
          <p class="text-gray-600 mb-6">输入关键词开始智能检索</p>

          <a-input-search
            v-model:value="searchValue"
            :placeholder="`请输入要搜索的${curMenuItem.type === 'law' ? '法律条文' : '案例'}关键词`"
            size="large"
            enter-button="开始搜索"
            :loading="isSearching"
            @search="handleSearch"
            allow-clear
          />

          <!-- 建议词条 -->
          <div class="grid grid-cols-3 gap-4 mt-8">
            <div
              v-for="(term, index) in suggestedTerms"
              :key="index"
              @click="handleSuggestedSearch(term)"
              class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <h4 class="font-medium text-gray-800 mb-1 group-hover:text-red-600 transition-colors">{{ term }}</h4>
              <p class="text-sm text-gray-600">点击搜索</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史会话：显示搜索结果列表 -->
      <div v-else class="h-full flex flex-col">
        <!-- 搜索框区域 -->
        <div class="p-4 bg-white border-b border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-medium text-gray-800 m-0">检索结果</h3>
            <a-badge :count="searchResults.length" v-if="searchResults.length > 0" />
          </div>

          <div class="flex items-center gap-3">
            <div class="flex-1 max-w-lg">
              <a-input-search
                v-model:value="searchValue"
                :placeholder="`继续检索${curMenuItem.type === 'law' ? '法条' : '案例'}`"
                enter-button="搜索"
                :loading="isSearching"
                @search="handleSearch"
                allow-clear
              />
            </div>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- 加载状态 -->
          <div v-if="isSearching" class="flex flex-col items-center justify-center h-48">
            <a-spin size="large" />
            <p class="mt-4 text-gray-600">正在检索中...</p>
          </div>

          <!-- 结果列表 -->
          <div v-else-if="searchResults.length > 0">
            <!-- 结果统计 -->
            <div class="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">
                  共���到 <span class="font-semibold text-red-600">{{ searchResults.length }}</span> 条相关结果
                </span>
                <a-dropdown placement="bottomRight">
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="relevance">按相关性排序</a-menu-item>
                      <a-menu-item key="time">按时间排序</a-menu-item>
                      <a-menu-item key="source">按来源排序</a-menu-item>
                    </a-menu>
                  </template>
                  <a-button type="text" size="small">
                    ������ <DownOutlined />
                  </a-button>
                </a-dropdown>
              </div>
            </div>

            <!-- 结果卡片列表 -->
            <div class="space-y-3">
              <div
                v-for="(item, index) in searchResults"
                :key="index"
                class="bg-white rounded-lg border border-gray-200 p-4 hover:border-red-300 hover:shadow-md transition-all duration-200"
              >
                <!-- 标题 -->
                <div class="flex items-start justify-between mb-3">
                  <h4 class="text-base font-medium text-gray-800 leading-6 flex-1 pr-4">
                    {{ item.title || item.name || `检索结果 ${index + 1}` }}
                  </h4>
                  <a-tag v-if="item.source" color="red" size="small">
                    {{ item.source }}
                  </a-tag>
                </div>

                <!-- 内容 -->
                <p class="text-sm text-gray-600 leading-6 mb-3 line-clamp-3">
                  {{ item.content || item.description || item.summary }}
                </p>

                <!-- 底部信息 -->
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <div class="flex items-center gap-3">
                    <span v-if="item.date">{{ item.date }}</span>
                    <span v-if="item.category">{{ item.category }}</span>
                  </div>
                  <a-button type="link" size="small" class="!p-0 !h-auto">
                    查看详情
                  </a-button>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div class="mt-6 flex justify-center">
              <a-pagination
                v-model:current="currentPage"
                v-model:page-size="pageSize"
                :total="searchResults.length"
                :show-size-changer="false"
                :show-quick-jumper="true"
                size="default"
                :show-total="(total, range) => `${range[0]}-${range[1]} / ${total}`"
              />
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="h-64">
            <a-empty :description="`暂无${curMenuItem.type === 'law' ? '法条' : '案例'}检索结果`">
              <a-button type="primary" @click="searchValue = ''">
                开始搜索
              </a-button>
            </a-empty>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 移除所有复杂的科技感样式，使用简洁的默认样式 */
</style>
