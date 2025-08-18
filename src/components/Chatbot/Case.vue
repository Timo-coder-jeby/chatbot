<script setup lang="ts">
import { ref, inject, computed, watch } from 'vue'
import { SearchOutlined, FileSearchOutlined, DownOutlined,ClockCircleOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { type IAIService } from '@/services/aiService.ts'

const aiService = inject<IAIService>('aiService')!
import serviceData from './data.json'

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

const SORT_OPTIONS = [
  { label: '相关性', value: 'similarity' },
  { label: '发布时间', value: 'releaseDate' },
  { label: '实施时间', value: 'implementDate' }
]

// 搜索相关状态
const searchValue = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const serviceResult:any = ref(null)
const sortRule = ref('similarity')
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
    // 获取历史会话消息
    const response = await aiService.get(`/chat/session/messages/${currentConversation.value.sessionKey}`)

    // const response = serviceData.data
    serviceResult.value = response
    console.log('🥶',response);
    // 处理您提供的法规搜索数据结构
    if (response?.lawResult && Array.isArray(response.lawResult)) {
      // 直接使用 lawResult 数组
      searchResults.value = response.lawResult
    } else if (Array.isArray(response)) {
      // 从消息数组中查找包含法规数据的消息
      const searchMessages = response.filter(msg =>
        msg.type === 'AI' && msg.text && (
          msg.text.includes('lawResult') ||
          msg.text.includes('lawDomain') ||
          msg.text.includes('currentPage') ||
          msg.text.includes('totalCount')
        )
      )

      if (searchMessages.length > 0) {
        // 尝试从最新的搜索消息中解析数据
        const latestSearchMsg = searchMessages[searchMessages.length - 1]
        try {
          const parsed = JSON.parse(latestSearchMsg.text)
          if (parsed.lawResult && Array.isArray(parsed.lawResult)) {
            searchResults.value = parsed.lawResult
          } else {
            searchResults.value = []
          }
        } catch (parseError) {
          console.warn('解析历史搜索结果失败:', parseError)
          searchResults.value = []
        }
      } else {
        searchResults.value = []
      }
    } else {
      searchResults.value = []
    }
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
    isSearching.value = true
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

// 格式化法规数据用于显示
const formatLawData = (item: any) => {
  const lawDomain = item.lawDomain || {}
  const potencyLevels = lawDomain?.potencyLevel ? JSON.parse(lawDomain.potencyLevel) : {}
  return {
    title: lawDomain.lawName || lawDomain.lawTitle || '未知法规',
    content: lawDomain.lawSourceContent || '',
    similarity: item.similarity || '0',
    issuingOrgan: (lawDomain.issuingOrgan && JSON.parse(lawDomain.issuingOrgan)) || '',
    issuingNo: lawDomain.issuingNo || '',
    releaseDate: lawDomain.releaseYearMonthDate || '',
    implementDate: lawDomain.implementYearMonthDate || '',
    potencyLevels,
    timeliness: lawDomain.timeliness || '',
    thematicClassify: lawDomain.thematicClassify || ''
  }
}

// 获取时效性颜色
const getTimelinessColor = (timeliness: string) => {
  const colorMap: Record<string, string> = {
    '现行有效': 'green',
    '已废止': 'red',
    '已失效': 'orange',
    '已修改': 'blue'
  }
  return colorMap[timeliness] || 'default'
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 bg-gray-50 overflow-hidden case-box">
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
    <div class="flex-1 overflow-y-auto">
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
        <!-- 搜索结果 -->
        <div class="h-full flex flex-col">
          <div class="h-full p-4 w-full">
            <!-- 加载状态 -->
            <div v-if="isSearching" class="flex flex-col items-center justify-center h-48">
              <a-spin size="large" />
              <p class="mt-4 text-gray-600">正在检索中...</p>
            </div>

            <!-- 结果列表 -->
            <div v-else-if="!!searchResults?.length" class="h-full flex flex-col">
              <!-- 结果统计 -->
              <div class="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">
                    <ClockCircleOutlined /><span class="font-semibold pl-2">{{ serviceResult?.query }}</span>
                  </span>
                  <a-select
                    v-model:value="sortRule"
                    class="w-[100px] border-none"
                    :dropdownMatchSelectWidth="false"
                  >
                    <a-select-option
                      v-for="option in SORT_OPTIONS"
                      :key="option.value"
                      :value="option.value"
                      :title="option.label"
                    >{{ option.label }}</a-select-option>
                  </a-select>
                </div>
              </div>

              <!-- 结果卡片列表  searchResults -->
              <div class="flex-1 overflow-y-auto">
                <a-list
                  item-layout="vertical" size="large"  :data-source="searchResults"
                >
                  <template #renderItem="{item}">
                    <a-list-item :key="item?.similarity">
                      <a-list-item-meta>
                        <template #title>
                          <div class="flex items-center justify-between">
                            <div class="text-blue-600">{{ formatLawData(item).title }}</div>
                            <a-tag color="processing">{{ formatLawData(item).timeliness }}</a-tag>
                          </div>
                        </template>
                        <template #description>
                          <div>
                            <div class="text-xs text-gray-400 divide-x divide-gray-300 flex items-center pb-2">
                              <div class="px-2">{{ formatLawData(item).potencyLevels?.level1Name }}</div>
                              <div class="px-2">{{ formatLawData(item).issuingOrgan?.level1Name }}</div>
                              <div class="px-2">{{ formatLawData(item)?.issuingNo }}</div>
                              <div class="px-2">{{ formatLawData(item).releaseDate }}公布</div>
                              <div class="px-2">{{ formatLawData(item).implementDate }}施行</div>
                            </div>
                            <div class="bg-white rounded-md py-2 px-4 text-gray-700 text-xs border border-gray-100" v-html="formatLawData(item).content"></div>
                          </div>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
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
  </div>
</template>

<style scoped lang="scss">
.case-box{
  &:deep(.ant-select-selector){
    border: none;
    background: transparent;
    .ant-select-selection-item{
      color: #8f91a8;
      font-weight: 600;
    }
  }
  &:deep(.ant-select-focused .ant-select-selector) {
    box-shadow: none !important;
  }
}
</style>
