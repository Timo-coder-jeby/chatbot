<script setup lang="ts">
import { ref, inject, computed, watch } from 'vue'

import IframeCot from './IframeCot.vue'
import { SearchOutlined, FileSearchOutlined,ClockCircleOutlined } from '@ant-design/icons-vue'
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
  'send-message': [message: string, callback?: (response: any) => void]
}>()

const SORT_OPTIONS = {
  law: [
    { label: '相关度', value: 'similarity' },
    { label: '发布时间', value: 'releaseDate' },
    { label: '实施时间', value: 'implementDate' }
  ],
  case: [
    { label: '相关度', value: 'similarity' },
    { label: '裁判日期', value: 'trialDate' },
  ]
}

const LAW_TITLE_KEY = [
  { key: 'potencyLv1'},
  { key: 'issuingOrganLv1'},
  { key: 'issuingNo'},
  { key: 'releaseDate', suffix: '公布' },
  { key: 'implementDate', suffix: '施行' }
]

const CASE_FILTER = [
  { key: '其他', label: '普通案例' },
  { key: '参考', label: '公报案例' },
  { key: '指导性', label: '指导性案例' },
]

// 搜索相关状态
const searchValue = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const serviceResult:any = ref(null)
const sortRule = ref('similarity')
const curFilterKey = ref<string>('其他')

const iframeVisible = ref<boolean>(false)
const iframeUrl = ref<string>('')
const iframeTitle = ref<string>('')

const currentPage = ref(1)
const pageSize = ref(10)

const openIframe = (id: string, title: string) => {
  'https://tongyi.aliyun.com/farui/caseDetail/86ae7501d20167f2fc6e86405439e626'
  iframeUrl.value = `https://tongyi.aliyun.com/farui/${curKeyType.value}Detail/${id}`
  iframeTitle.value = title
  iframeVisible.value = true
}

/**
 * 建议搜索词条
 */
const suggestedTerms = computed(() => {
  return props.curMenuItem.type === 'law' ?
    [
    '劳动合同法',
    '刑法修正案',
    '民事诉讼法',
    '知识产权法',
    '公司法条例',
    '婚姻法规定'
    ] :
    [
      '合同纠纷案例',
      '交通事故赔偿',
      '劳动争议案件',
      '房产纠纷判决',
      '知识产权侵权',
      '刑事辩护案例'
    ]
})

// 计算是否为新会话
const isNewConversation = computed(() => {
  return props.activeConversationKey.startsWith('conv-')
})

// 计算当前会话
const currentConversation = computed(() => {
  return props.conversationList.find(item => item.key === props.activeConversationKey)
})

const setCaseList = (response: any) => {
  serviceResult.value = response
  searchResults.value = response?.lawResult ?? response?.caseResult ?? []
  isSearching.value = false
}

// 加载历史会话的搜索结果
const loadHistoryResults = async () => {
  if (!currentConversation.value?.sessionKey) return

  isSearching.value = true
  try {
    // 获取历史会话消息
    const response = await aiService.get(`/chat/session/messages/${currentConversation.value.sessionKey}`)
    setCaseList(response)
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
},{ immediate: false})

// 执行搜索
const handleSearch = async () => {
  if (!searchValue.value.trim()) return

  // 如果是新会话，使用 handleSendMessage 获取 sessionId
  if (isNewConversation.value) {
    isSearching.value = true
    emit('send-message', searchValue.value, async (response) => {
      console.log(response);
      if (response?.data?.sessionId) {
        currentConversation.value.sessionKey = response?.data?.sessionId
        setCaseList(response?.data?.data)
      } else {
        message.error('获取会话 ID 失败，请稍后重试')
      }
    })
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
const stripRN = (str: string) => str.replace(/\\r\\n|\\r|\\n|[\r\n]/g, '')

const curKeyType = computed(() => props?.curMenuItem?.type || 'law')

/**
 * 格式化法律数据
 * @param item
 */
const formatLawData = (item: any) => {
  const domain = item.lawDomain || item.caseDomain || {}
  const potencyLevels = domain?.potencyLevel ? JSON.parse(domain.potencyLevel) : {}
  const issuingOrgan = (domain.issuingOrgan && JSON.parse(domain.issuingOrgan)) || ''
  return {
    domain,
    id: domain[`${curKeyType.value}Id`],
    title: domain[`${curKeyType.value}Name`] || domain?.[`${curKeyType.value}Title`] || '未知法规',
    content: stripRN(domain?.[`${curKeyType.value}SourceContent`] || ''),
    similarity: item.similarity || '0',
    issuingOrgan,
    issuingOrganLv1: issuingOrgan.level1Name || '',
    issuingNo: domain.issuingNo || '',
    releaseDate: domain.releaseYearMonthDate || '',
    implementDate: domain.implementYearMonthDate || '',
    potencyLevels,
    potencyLv1: potencyLevels.level1Name || '',
    timeliness: domain.timeliness || domain?.caseType || '',
    thematicClassify: domain.thematicClassify || '',
    courtThink: stripRN(domain.courtThink || ''),
    verdict: stripRN(domain.verdict || ''),
  }
}

const caseItemTabLabel = computed(() => (tabKey:string) => {
  const LABELS = {
    courtThink: '法院观点',
    verdict: '判决结果'
    }
    return LABELS[tabKey as keyof typeof LABELS] || '未知标签'
  }
)
</script>

<template>
  <div class="flex flex-col flex-1 overflow-hidden case-box">
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
        <div class="h-full px-4 w-full">
          <!-- 加载状态 -->
          <div v-if="isSearching" class="flex flex-col items-center justify-center pt-[20vh]">
            <a-spin size="large" />
            <p class="mt-4 text-gray-400 text-sm">检索中...</p>
          </div>

          <!-- 结果列表 -->
          <div v-else-if="!!searchResults?.length" class="h-full flex flex-col">
            <!-- 结果统计 -->
            <div class="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm text-gray-600">
                    <ClockCircleOutlined /><span class="font-semibold pl-2">{{ serviceResult?.query }}</span>
                  </div>
                  <div v-if="curKeyType == 'case'" class="divide-x divide-gray-300 flex items-center text-xs text-gray-500 pt-4">
                    <div
                      :class="['px-2','cursor-pointer','font-bold',{'text-blue-600': curFilterKey == tab.key}]"
                      v-for="tab in CASE_FILTER"
                      :key="tab.key"
                      @click="curFilterKey = tab.key"
                    >{{ tab.label }}</div>
                  </div>
                </div>
                <a-select
                  v-model:value="sortRule"
                  class="w-[100px] border-none"
                  :dropdownMatchSelectWidth="false"
                >
                  <a-select-option
                    v-for="option in (SORT_OPTIONS as any)[curKeyType]"
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
                        <div class="flex items-center justify-between gap-2">
                          <div
                            class="text-blue-600 line-clamp-1 cursor-pointer font-bold"
                            @click="openIframe(formatLawData(item).id,formatLawData(item).title)"
                          >{{ formatLawData(item).title }}</div>
                          <a-tag color="processing">{{ formatLawData(item).timeliness }}</a-tag>
                        </div>
                      </template>
                      <template #description>
                        <div>
                          <!-- 标题头部信息 -->
                          <div class="text-xs text-gray-400 divide-x divide-gray-300 flex items-center pb-2">
                            <template v-if="curKeyType == 'law'">
                              <template v-for="law in LAW_TITLE_KEY" :key="law.key">
                                <div v-if="!!(formatLawData(item) as any)[law.key]" class="px-2">{{ (formatLawData(item) as any)[law.key] }}{{law.suffix ? ` ${law.suffix}` : ''}}</div>
                              </template>
                            </template>
                            <template v-if="curKeyType == 'case'">
                              <template v-for="c in ['caseCause','caseNo','trialDate','trialLevel']" :key="c">
                                <div class="px-2" v-if="!!formatLawData(item).domain?.[c]">{{ formatLawData(item).domain?.[c] }}</div>
                              </template>
                            </template>
                          </div>

                          <!-- 内容信息 -->
                          <div class="bg-gray-100 rounded-md py-2 px-4 text-gray-700 text-xs">
                            <div v-if="curKeyType == 'law'" class="m-0 p-0 line-clamp-[8]">{{ formatLawData(item).content }}</div>
                            <div class="m-0 p-0" v-if="curKeyType == 'case'">
                              <div class="text-xs text-gray-400 divide-x divide-gray-300 flex items-center p-2">
                                <div
                                  v-for="(key,n) in ['courtThink','verdict']"
                                  :key="key"
                                  @click="() => {
                                    item.caseTabKey = key
                                    console.log('当前',item);
                                  }"
                                  :class="['cursor-pointer','px-2',{'text-blue-600': item.caseTabKey ? item.caseTabKey == key : n == 0}]"
                                >{{ caseItemTabLabel(key) }}</div>
                              </div>
                              <div class="line-clamp-[8]">{{ (formatLawData(item) as any)?.[item?.caseTabKey || 'courtThink'] }}</div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="pt-[20vh] text-gray-400">
            <a-empty
              :description="`暂无${curMenuItem.type === 'law' ? '法条' : '案例'}检索结果`"
            />
          </div>
        </div>
      </div>
    </div>
    <IframeCot
      :visible="iframeVisible"
      :url="iframeUrl"
      :title="iframeTitle"
      @close="iframeVisible = false"
    />
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
  &:deep(.ant-list-item){
    padding: 16px 4px;
  }
}
</style>
