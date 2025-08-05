<template>
  <div class="chat-container">
    <!-- 左侧对话列表 -->
    <SideBar
      :conversationList="conversationList"
      :activeConversationKey="activeConversationKey"
      @create-new-chat="createNewChat"
      @conversation-change="handleConversationChange"
      @delete-conversation="deleteConversation"
    />
    <!-- 右侧聊天区域 -->
    <div class="main-content">
      <!-- 顶部标题 -->
      <div class="chat-header">
        <a-upload
          :action="BASEURL + '/document/load/file'"
          @change="uploadChange"
          name="files"
        >
          <a-button
            type="primary"
            ghost
            :icon="h(SettingOutlined)"
          >模型微调</a-button>
        </a-upload>
      </div>

      <!-- 聊天内容区域 -->
      <ChatContent
        :messages="currentMessages"
        :isTyping="isTyping"
        v-model:senderValue="senderValue"
        @send-message="handleSendMessage"
        ref="chatContentRef"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, reactive, inject, h, onMounted} from 'vue'
import { message } from "ant-design-vue";
import { SettingOutlined } from '@ant-design/icons-vue'
import { type IAIService, type ConversationItem, type MessageItem } from '@/services/aiService.ts'

import SideBar from "./SideBar.vue";
import ChatContent from "./ChatContent.vue";

const aiService = inject<IAIService>('aiService')!

// 响应式数据
const activeConversationKey = ref('conv-1')
const isTyping = ref(false)
const senderValue = ref('')
const chatContentRef = ref<InstanceType<typeof ChatContent>>()

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
    const sessionObj = await aiService.get('/chat/sessions')

    // 清空现有对话列表
    conversationList.length = 0

    if (sessionObj?.sessions?.length > 0) {
      // 转换服务器返回的数据为本地数据结构
      sessionObj.sessions.forEach((session: any) => {
        const conversation: ConversationItem = {
          key: session.sessionId,
          label: session.title || '新建对话',
          timestamp: new Date(session.createTime).getTime(),
          sessionKey: session.sessionId
        }
        conversationList.push(conversation)
      })

      // 设置第一个对话为活跃对话并加载其消息
      const firstConversation = conversationList[0]
      activeConversationKey.value = firstConversation.key
      await loadCurrentMessages(firstConversation.key)
    } else {
      // 如果接口返回空数组，插入一条新消息
      const defaultConversation: ConversationItem = {
        key: 'conv-1',
        label: '新建对话',
        timestamp: Date.now()
      }
      conversationList.push(defaultConversation)
      activeConversationKey.value = 'conv-1'
      currentMessages.value = []
    }
  } catch (error) {
    console.error('获取对话列表失败:', error)
    // 如果获取失败，保持默认对话
    if (conversationList.length === 0) {
      const defaultConversation: ConversationItem = {
        key: 'conv-1',
        label: '新建对话',
        timestamp: Date.now()
      }
      conversationList.push(defaultConversation)
      activeConversationKey.value = 'conv-1'
      currentMessages.value = []
    }
  }
}

/**
 * 加载当前会话的消息
 */
const loadCurrentMessages = async (key: string) => {
  // 检查是否为新的会话（conv-开头）
  const isNewConversation = key.startsWith('conv-')

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
    const response = await aiService.get(`/chat/session/messages/${key}`)

    if (response && Array.isArray(response)) {
      // 转换消息数据格式
      const messages: MessageItem[] = response
        .filter(item => item.type !== 'SYSTEM') // 过滤掉系统消息
        .map(item => {
          // 解析消息内容
          let content = ''

          if (item.type === 'USER') {
            // 从 UserMessage 格式中提取文本内容
            const match = item.text.match(/TextContent \{ text = "(.+?)" \}/)
            content = match ? match[1].replace(/\\r\\n/g, '\n').replace(/\\"/g, '"') : item.text
          } else if (item.type === 'AI') {
            // 从 AiMessage 格式中提取文本内容
            const match = item.text.match(/AiMessage \{ text = "(.+?)" toolExecutionRequests/)
            content = match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : item.text
          }

          return {
            key: `${item.type.toLowerCase()}-${item.timestamp}`,
            role: item.type === 'USER' ? 'user' : 'assistant',
            content: content,
            timestamp: item.timestamp
          } as MessageItem
        })
        .sort((a, b) => a.timestamp - b.timestamp) // 按时间排序

      currentMessages.value = messages

      // 滚动到底部显示最新消息
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } else {
      currentMessages.value = []
    }
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
 * 删除对话
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

const handleSendMessage = async (message: string) => {
  if (!message.trim() || isTyping.value) return

  // 立即清空输入框
  senderValue.value = ''

  const currentConversation = conversationList.find(
    item => item.key === activeConversationKey.value
  )

  if (!currentConversation) return

  isTyping.value = true

  // 如果没有sessionKey，先创建会话
  if (!currentConversation.sessionKey) {
    const { data: sessionKey } = await aiService.createMessage()
    currentConversation.sessionKey = sessionKey
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
    // 使用流式响应
    await aiService.sendMessageStream(
      {
        sessionId: currentConversation.sessionKey ?? '',
        question: message
      },
      // 流式回调函数 - 实时更新AI消息内容
      (chunk: string) => {
        // 只有在第一次收到chunk且还未添加时才添加到消息列表
        if (!aiMessageAdded && chunk.trim()) {
          aiMessage.content = chunk
          currentMessages.value.push(aiMessage)
          aiMessageAdded = true
          // 收到第一个有效chunk时立即关闭typing状态
          isTyping.value = false
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
      }
    )

    // 如果没有收到任何内容，添加错误消息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，没有收到回复，请重试。'
      currentMessages.value.push(aiMessage)
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    // 如果流式请求失败，显示错误信息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，服务暂时不可用，请稍后重试。'
      currentMessages.value.push(aiMessage)
    }
  } finally {
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
</script>

<style lang="scss" scoped>
@use './index'
</style>
