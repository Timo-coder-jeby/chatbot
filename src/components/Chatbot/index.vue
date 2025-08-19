<template>
  <div class="grid grid-cols-[290px_1fr] grid-rows-1 gap-4 h-screen w-screen p-4 bg-gradient-to-br from-red-50 via-rose-50 to-red-100 relative overflow-hidden">
    <!-- 背景装饰效果 -->
    <div class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,rgba(239,68,68,0.15)_1px,transparent_0)] bg-[length:25px_25px] animate-pulse"></div>

    <!-- 浮动光晕效果 -->
    <div class="absolute top-1/5 right-[15%] w-72 h-72 bg-gradient-radial from-red-200/30 to-transparent rounded-full animate-float opacity-50"></div>
    <div class="absolute bottom-1/4 left-[10%] w-48 h-48 bg-gradient-radial from-rose-200/20 to-transparent rounded-full animate-float delay-1000 opacity-40"></div>

    <!-- 左侧对话列表 -->
    <SideBar
      :conversationList="conversationList"
      :activeConversationKey="activeConversationKey"
      :techMenu="techMenu"
      :curMenuIndex="curMenuIndex"
      @create-new-chat="createNewChat"
      @conversation-change="handleConversationChange"
      @delete-conversation="deleteConversation"
      @menu-change="handleMenuChange"
    />

    <!-- 右侧聊天区域 -->
    <div class="col-start-2 row-start-1 grid grid-rows-[auto_1fr] bg-white/95 backdrop-blur-xl relative z-10 rounded-3xl shadow-2xl border border-red-100/30 overflow-hidden">
      <!-- 法律咨询时显示聊天内容 -->
      <ChatContent
        v-if="curMenuItem.type === 'consult'"
        :messages="currentMessages"
        :isTyping="isTyping"
        v-model:senderValue="senderValue"
        @send-message="handleSendMessage"
        @cancel-conversation="handleCancelConversation"
        ref="chatContentRef"
      />

      <!-- 法律检索和案例检索时显示Case组件 -->
      <Case
        v-else
        :curMenuItem="curMenuItem"
        :conversationList="conversationList"
        :activeConversationKey="activeConversationKey"
        :currentMessages="currentMessages"
        @send-message="handleSendMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, reactive, inject, h, onMounted, nextTick} from 'vue'
import { message } from "ant-design-vue";
import {
  MessageOutlined,
  FileSearchOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { type IAIService, type ConversationItem, type MessageItem } from '@/services/aiService.ts'

import SideBar from "./SideBar.vue";
import ChatContent from "./ChatContent.vue";
import Case from "./Case.vue";

const aiService = inject<IAIService>('aiService')!

// 响应式数据
const activeConversationKey = ref('conv-1')
const isTyping = ref(false)
const senderValue = ref('')
const chatContentRef = ref<InstanceType<typeof ChatContent>>()
const techMenu = ref([
  {
    key: 'advisory',
    title: '法律咨询',
    icon: h(MessageOutlined),
    apiBase: '/farui/legalAdvice/consult',
    apiType: 'stream',
    type: 'consult'
  },
  {
    key: 'index-law',
    title: '法律检索',
    icon: h(SearchOutlined),
    apiBase: '/farui/search/law/query',
    apiType: 'ajax',
    type: 'law'
  },
  {
    key: 'index-case',
    title: '案例检索',
    icon: h(FileSearchOutlined),
    apiBase: '/farui/search/case/fulltext',
    apiType: 'ajax',
    type: 'case'
  },
])
const curMenuIndex = ref(0)
const curMenuItem = computed(() => techMenu.value[curMenuIndex.value])

// 对话列表 - 直接从接口获取
const conversationList = reactive<ConversationItem[]>([])

// 当前消息列表 - 实时从接口获取
const currentMessages = ref<MessageItem[]>([])

onMounted(() => {
  loadConversationList()
})

/**
 * 加载对话列表
 */
const loadConversationList = async () => {
  try {
    // 根据当前菜单类型构建请求参数
    const requestParams: any = {}
    if (curMenuItem.value?.type) {
      requestParams.type = curMenuItem.value.type
    }

    // 如果有type参数，作为查询参数传递
    const queryString = requestParams.type ? `?type=${requestParams.type}` : ''
    const { sessions } = await aiService.get(`/chat/sessions${queryString}`)

    // 直接替换整个数组而不是逐个push，减少数组操作次数
    if (Array.isArray(sessions) && sessions.length > 0) {
      // 一次性映射和排序，减少遍历次数
      const mappedSessions = sessions
        .map((session: any) => ({
          key: session.sessionId,
          label: session.title
            ? (session.title.replace(/\r\n/g, '').slice(0, 30) + (session.title.length > 30 ? '...' : ''))
            : '新建对话',
          timestamp: new Date(session.createTime || session.createTime).getTime(),
          sessionKey: session.sessionId
        }))
      if (mappedSessions.length > 0) {
        // 直接替换整个数组
        conversationList.splice(0, conversationList.length, ...mappedSessions)

        // 确保设置有效的activeConversationKey
        const firstSessionKey = mappedSessions[0].key
        if (firstSessionKey) {
          activeConversationKey.value = firstSessionKey
          await loadCurrentMessages(firstSessionKey)
        } else {
          // 如果第一个session的key无效，设置默认值
          activeConversationKey.value = 'conv-1'
          currentMessages.value = []
        }
      } else {
        // 如果没有有效的session，设置默认对话
        const defaultConversation: ConversationItem = {
          key: 'conv-1',
          label: '新建对话',
          timestamp: Date.now()
        }
        conversationList.splice(0, conversationList.length, defaultConversation)
        activeConversationKey.value = 'conv-1'
        currentMessages.value = []
      }
    } else {
      // 如果接口返回空数组，直接替换为默认对话
      const defaultConversation: ConversationItem = {
        key: 'conv-1',
        label: '新建对话',
        timestamp: Date.now()
      }
      conversationList.splice(0, conversationList.length, defaultConversation)
      activeConversationKey.value = 'conv-1'
      currentMessages.value = []
    }
  } catch (error) {
    console.error('获取对话失败:', error)
    // 确保在错误情况下也有默认值
    if (conversationList.length === 0) {
      const defaultConversation: ConversationItem = {
        key: 'conv-1',
        label: '新建对话',
        timestamp: Date.now()
      }
      conversationList.splice(0, conversationList.length, defaultConversation)
    }
    // 确保activeConversationKey有值
    if (!activeConversationKey.value) {
      activeConversationKey.value = conversationList[0]?.key || 'conv-1'
    }
  }
}

/**
 * 加载当前会话的消息 - 优化版本
 */
const loadCurrentMessages = async (key: string) => {
  // 检查是否为新的会话（conv-开头）
  const isNewConversation = key?.startsWith('conv-')

  if (isNewConversation) {
    // 查找对应的会话对象
    const conversation = conversationList.find(item => item.key === key)

    // 如果新会话还没有 sessionKey，说明还没有进行过对话，保持空状态
    if (!conversation?.sessionKey) {
      currentMessages.value = []
      return
    }

    // 如果新会话已经有了 sessionKey，使用 sessionKey 来获取消息
    key = conversation.sessionKey
  }

  try {
    // fixme 如果是ajax请求组件内加载内容
    if (curMenuItem.value?.apiType == 'ajax') return
    const response = await aiService.post(`/chat/session/messages`,{sessionId: key})

    if (!response || !Array.isArray(response)) {
      currentMessages.value = []
      return
    }

    // 预编译正则表达式，避免重复编译 - O(1) 时间复杂度优化
    const userMessageRegex = /UserMessage \{[\s\S]*?TextContent \{ text = "([\s\S]*?)" \}[\s\S]*?\}/
    const simpleTextRegex = /TextContent \{ text = "(.*?)" \}/
    const aiMessageRegex = /AiMessage \{ text = "([\s\S]*?)" toolExecutionRequests/

    // 单次遍历处理所有消息 - O(n) 时间复杂度
    const messages = response.reduce<MessageItem[]>((acc, item, index) => {
      if (item.type === 'SYSTEM') return acc // 过滤系统消息

      let content = ''

      // 优化字符串匹配，减少正则执行次数
      if (item.type === 'USER') {
        const match = userMessageRegex.exec(item.text) || simpleTextRegex.exec(item.text)
        content = match?.[1]?.replace(/\\r\\n/g, '\n').replace(/\\"/g, '"') ?? item.text
      } else if (item.type === 'AI') {
        const match = aiMessageRegex.exec(item.text)
        content = match?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') ?? item.text
      }

      acc.push({
        key: `${item.type.toLowerCase()}-${item.timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`, // 添加随机字符串确保唯一性
        role: item.type === 'USER' ? 'user' : 'assistant',
        content,
        timestamp: item.timestamp
      })

      return acc
    }, [])

    // 使用更高效的排序 - 避免不必要的比较
    messages.sort((a, b) => a.timestamp - b.timestamp)

    // 直接赋值，避免响应式数组操作开销
    currentMessages.value = messages

    // 使用 nextTick 优化 DOM 更新时机
    nextTick(() => scrollToBottom())

  } catch (error) {
    console.error('获取会话消息失败:', error)
    currentMessages.value = []
  }
}

// 创建新对话
const createNewChat = () => {
  const newKey = `conv-${Date.now()}`
  const newConversation: ConversationItem = {
    key: newKey,
    label: '新建对话',
    timestamp: Date.now()
  }

  conversationList.unshift(newConversation)
  activeConversationKey.value = newKey
  currentMessages.value = []
}

// 切换对话
const handleConversationChange = async (key: string) => {
  activeConversationKey.value = key
  await loadCurrentMessages(key)
}

/**
 * 删除会话
 */
const deleteConversation = async (key: string) => {
  if (conversationList.length <= 1) return

  try {
    // 检查是否为新会话（conv-开头），新会话不需要调用删除接口
    const isNewConversation = key.startsWith('conv-')

    if (!isNewConversation) {
      // 调用删除接口删除服务器端的会话
      await aiService.del(`/chat/session/${key}`)
    }

    // 删除成功后重新加载对话列表，保持最新状态
    await loadConversationList()

    message.success('会话删除成功')
  } catch (error) {
    console.error('删除会话失败:', error)
    message.error('删除会话失败，请稍后重试')
  }
}

// 用于控制流式响应的 AbortController
let abortController: AbortController | null = null

/**
 * todo 所有新建的会话都走该方法
 * @param message
 * @param callback
 */
const handleSendMessage = async (message: string,callback?: (resp:any) => {}) => {
  if (!message.trim() || isTyping.value) return

  // 立即清空输入框
  senderValue.value = ''

  const currentConversation = conversationList.find(
    item => item.key === activeConversationKey.value
  )

  if (!currentConversation) return

  isTyping.value = true

  // 创建新的 AbortController
  abortController = new AbortController()

  // 如果没有sessionKey，先创建会话
  if (!currentConversation.sessionKey) {
    const response = await aiService.createMessage(curMenuItem.value.type)
    currentConversation.sessionKey = response?.sessionId || `session-${Date.now()}`
  }

  // 添加用户消息
  const userMessage: MessageItem = {
    key: `user-${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: Date.now()
  }

  currentMessages.value.push(userMessage)

  // 添加用户消息后自动滚动到底部
  scrollToBottom()

  // 更新对话标题（首次消息）
  if (currentMessages.value.length === 1) {
    currentConversation.label = message.slice(0, 15) + (message.length > 15 ? '...' : '')
  }

  // 创建AI消息占位符，但暂时不添加到消息列表中
  const aiMessage: MessageItem = {
    key: `ai-${Date.now()}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  }

  // 标记是否已添加到消息列表
  let aiMessageAdded = false

  try {
    // 使用流式响应，传入 signal
    const resp = await aiService.sendMessageStream(
      techMenu.value[curMenuIndex.value].apiBase ?? undefined,
      {
        sessionId: currentConversation.sessionKey ?? '',
        question: message
      },
      // 流式回调函数 - 实时更新AI消息内容
      (chunk: string) => {
        // 检查是否已被取消
        if (abortController?.signal.aborted) {
          return
        }

        // 只有在第一次收到chunk且还未添加时才添加到消息列表
        if (!aiMessageAdded && chunk.trim()) {
          aiMessage.content = chunk
          currentMessages.value.push(aiMessage)
          aiMessageAdded = true
          // AI消息开始时自动滚动
          scrollToBottom()
        } else if (aiMessageAdded) {
          // 如果已经添加到列表中，直接更新响应式数组中的对象
          const lastMessage = currentMessages.value[currentMessages.value.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += chunk
            // AI消息更新时也自动滚动
            scrollToBottom()
          }
        }
      },
      abortController.signal,
      (curMenuItem?.value?.apiType as 'stream' | 'ajax') || 'stream'
    )
    if (resp && curMenuItem.value.apiType == 'ajax') {
      if (conversationList[0]?.key?.startsWith('conv-') && resp.params.sessionId == currentConversation.sessionKey) {
        conversationList[0].key = resp.params.sessionId
        activeConversationKey.value = resp.params.sessionId
      }
    }

    // 如果没有收到任何内容，添加错误消息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，没有收到回复，请重试。'
      currentMessages.value.push(aiMessage)
    }
  } catch (error: any) {
    console.error('发送消息失败:', error)

    // 如果是用户取消，显示取消消息
    if (error.name === 'AbortError' || abortController?.signal.aborted) {
      if (aiMessageAdded) {
        // 如果已经有AI消息，在末尾添加取消标识
        const lastMessage = currentMessages.value[currentMessages.value.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += '\n\n*[会话已取消]*'
        }
      } else {
        // 如果还没有AI消息，添加取消消息
        aiMessage.content = '*[会话已取消]*'
        currentMessages.value.push(aiMessage)
      }
    } else {
      // 其他错误
      if (!aiMessageAdded) {
        aiMessage.content = '抱歉，服务暂时不可用，请稍后重试。'
        currentMessages.value.push(aiMessage)
      }
    }
  } finally {
    // 只在流式响应完全结束后才取消 loading 状态
    isTyping.value = false
    abortController = null
  }
}

const handleCancelConversation = () => {
  // 直接取消当前的流式请求
  if (abortController) {
    abortController.abort()
    isTyping.value = false
  }
}

const BASEURL = import.meta.env.VITE_APP_BASE_API
const uploadChange = ({file}:any) => {
  if (file.status === 'done'){
    message.success('微调数据上传成功')
  }
}

// 自动滚动到底部
const scrollToBottom = () => {
  chatContentRef.value?.scrollToBottom()
}

// 处理菜单切换
const handleMenuChange = async (index: number) => {
  curMenuIndex.value = index

  // 清空当前消息
  currentMessages.value = []

  // 无论切换到哪个技术类型，都重新加载会话列表
  await loadConversationList()
}
</script>

<style lang="scss" scoped>
@use './index';
</style>
