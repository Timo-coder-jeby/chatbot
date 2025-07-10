<script setup lang="ts">
import { ref, computed, reactive, inject,h } from 'vue'
import { message } from "ant-design-vue";
import { PlusOutlined, SettingOutlined,UserOutlined } from '@ant-design/icons-vue'
import { type IAIService } from '@/services/aiService'

const aiService = inject<IAIService>('aiService')!
// 类型定义
interface ConversationItem {
  key: string
  label: string
  timestamp: number,
  sessionKey?: string
}

interface MessageItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 响应式数据
const activeConversationKey = ref('conv-1')
const isTyping = ref(false)
const senderValue = ref('')

// 对话列表
const conversationList = reactive<ConversationItem[]>([
  {
    key: 'conv-1',
    label: '新建对话',
    timestamp: Date.now()
  }
])

// 消息存储
const messageStorage = reactive<Record<string, MessageItem[]>>({
  'conv-1': []
})

// 计算属性
const currentMessages = computed(() =>
  messageStorage[activeConversationKey.value] || []
)

const currentConversationTitle = computed(() => {
  const current = conversationList.find(item => item.key === activeConversationKey.value)
  return current?.label || 'ChatGPT'
})

// 对话菜单
const getConversationMenu = (conversation: ConversationItem) => ({
  items: [
    {
      key: 'delete',
      label: '删除',
      danger: true,
    }
  ],
  onClick: (menuInfo: any) => {
    menuInfo.domEvent.stopPropagation();
    deleteConversation(conversation.key)
  },
})

// 方法
const createNewChat = () => {
  const newKey = `conv-${Date.now()}`
  const newConversation: ConversationItem = {
    key: newKey,
    label: '新建对话',
    timestamp: Date.now()
  }

  conversationList.push(newConversation)
  messageStorage[newKey] = []
  activeConversationKey.value = newKey
}

const handleConversationChange = (key: string) => {
  activeConversationKey.value = key
}

const deleteConversation = (key: string) => {
  if (conversationList.length <= 1) return

  const index = conversationList.findIndex(item => item.key === key)
  if (index > -1) {
    conversationList.splice(index, 1)
    delete messageStorage[key]

    if (activeConversationKey.value === key) {
      activeConversationKey.value = conversationList[0]?.key || 'conv-1'
    }
  }
}

const clearCurrentChat = () => {
  messageStorage[activeConversationKey.value] = []
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

  messageStorage[activeConversationKey.value].push(userMessage)

  // 更新对话标题（首次消息）
  if (messageStorage[activeConversationKey.value].length === 1) {
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
          messageStorage[activeConversationKey.value].push(aiMessage)
          aiMessageAdded = true
          // 收到第一个有效chunk时立即关闭typing状态
          isTyping.value = false
        } else if (aiMessageAdded) {
          // 如果已经添加到列表中，直接更新响应式数组中的对象
          const currentMessages = messageStorage[activeConversationKey.value]
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += chunk
          }
        }
      }
    )

    // 如果没有收到任何内容，添加错误消息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，没有收到���复，请重试。'
      messageStorage[activeConversationKey.value].push(aiMessage)
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    // 如果流式请求失败，显示错误信息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，服务暂时不可用，请稍后重试。'
      messageStorage[activeConversationKey.value].push(aiMessage)
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

</script>
<template>
  <div class="chat-container">
    <!-- 左侧对话列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <a-button type="primary" @click="createNewChat" block>
          <template #icon>
            <PlusOutlined />
          </template>
          新建对话
        </a-button>
      </div>

      <div class="conversations-wrapper">
        <AXConversations
            :items="conversationList"
            :defaultActiveKey="activeConversationKey"
            @onActiveChange="handleConversationChange"
            :menu="getConversationMenu"
        />
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="main-content">
      <!-- 顶部标题 -->
      <div class="chat-header">
<!--        <a-typography-title :level="3" style="margin: 0;">
          {{ currentConversationTitle }}
        </a-typography-title>-->
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
<!--        <a-space>
          <a-button type="text" @click="clearCurrentChat">
            <template #icon>
              <DeleteOutlined />
            </template>
            清空
          </a-button>
        </a-space>-->
      </div>

      <!-- 聊天内容区域 -->
      <div class="chat-content">
        <!-- 聊天消息区域 -->
        <div class="chat-messages" v-if="currentMessages.length > 0">
          <div v-for="message in currentMessages" :key="message.key" class="message-item">
            <AXBubble
              :placement="message.role === 'user' ? 'end' : 'start'"
              :content="message.content"
              :avatar="{
                icon: h(message.role === 'user' ? UserOutlined : '🤖'),
                style:{
                  backgroundColor: message.role === 'user' ? '#00b96b' : '#fde3cf',
                  color: message.role === 'user' ? '#fff' : '#f56a00'
                }
              }"
              :styles="{
                content: {
                  backgroundColor: message.role === 'user' ? '#b7eb8f' : '',
                }
              }"
            />
          </div>

          <!-- AI正在输入提示 -->
          <div v-if="isTyping" class="message-item">
            <AXBubble
              placement="start"
              content=""
              :avatar="{ icon: '🤖' }"
              :typing="true"
            />
          </div>
        </div>

        <!-- 欢��信息（仅在无消息时显示） -->
        <h3 v-else class="tips">有什么可以帮助您的吗？</h3>

        <!-- Sender 输入组件 -->
        <div class="sender-area">
          <AXSender
              :autoSize="{ minRows: 3, maxRows: 6 }"
              :loading="isTyping"
              placeholder="输入消息..."
              @submit="handleSendMessage"
              v-model:value="senderValue"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;

  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e8e8e8;
    display: flex;
    flex-direction: column;

    &-header {
      padding: 16px;
      border-bottom: 1px solid #e8e8e8;
    }

    .conversations-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;

    .chat-header {
      padding: 16px 24px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;

      .chat-messages {
        flex: 1;
        padding: 16px;
        display: flex;
        flex-direction: column;

        .message-item {
          margin-bottom: 12px;
        }
      }

      .sender-area {
        padding: 16px;
      }

      .tips {
        text-align: center;
        padding: 20% 0 15px;
        color: #333;
        font-weight: 600;
      }
    }
  }
}

@media (max-width: 768px) {
  .chat-container {
    .sidebar {
      width: 240px;
    }
  }
}
</style>
