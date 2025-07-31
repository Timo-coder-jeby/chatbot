<template>
  <div class="chat-container">
    <!-- 左侧对话列表 -->
    <div class="sidebar">
      <!-- 顶部品牌区域 -->
      <div class="sidebar-brand">
        <div class="brand-logo">
          <img class="logo-icon" :src="robotImg"/>
          <span class="brand-text">Cloudata Ai</span>
        </div>
      </div>

      <!-- 新建对话按钮 -->
      <div class="sidebar-header">
        <a-button type="primary" @click="createNewChat" block class="new-chat-btn">
          <template #icon>
            <PlusOutlined />
          </template>
          新建对话
        </a-button>
      </div>

      <!-- 对话列表 -->
      <div class="conversations-wrapper">
        <div class="conversations-title">
          <MessageOutlined />
          <span>最近对话</span>
        </div>

        <div class="conversations-list">
          <div
            v-for="conversation in conversationList"
            :key="conversation.key"
            :class="['conversation-item', { 'active': conversation.key === activeConversationKey }]"
            @click="handleConversationChange(conversation.key)"
          >
            <div class="conversation-content">
              <div class="conversation-title">{{ conversation.label }}</div>
              <div class="conversation-time">{{ formatTime(conversation.timestamp) }}</div>
            </div>
            <div class="conversation-actions">
              <a-dropdown
                :trigger="['click']"
                placement="bottomRight"
                @click.stop
              >
                <a-button type="text" size="small" class="action-btn">
                  <template #icon>
                    <SettingOutlined />
                  </template>
                </a-button>
                <template #overlay>
                  <a-menu @click="(e) => handleMenuClick(e, conversation.key)">
                    <a-menu-item key="delete" class="danger-item">
                      <DeleteOutlined />
                      删除对话
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部用户信息 -->
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">
            <UserOutlined />
          </div>
          <div class="user-details">
            <div class="user-name">用户</div>
            <div class="user-status">在线</div>
          </div>
        </div>
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
        <div class="chat-messages" v-if="currentMessages.length > 0" ref="chatMessagesRef">
          <div v-for="message in currentMessages" :key="message.key" class="message-item">
            <AXBubble
              :placement="message.role === 'user' ? 'end' : 'start'"
              :content="message.content"
              :avatar="{
                ...(message?.role === 'user' ? {icon: h(UserOutlined)} : {src: robotImg}),
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

          <!-- AI正在提示 -->
          <div v-if="isTyping" class="message-item">
            <AXBubble
              placement="start"
              content=""
              :avatar="{ src: robotImg }"
              :typing="true"
            />
          </div>
        </div>

        <!-- 信息（仅在无消息时显示） -->
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

<script setup lang="ts">
import { ref, computed, reactive, inject, h, nextTick } from 'vue'
import { message } from "ant-design-vue";
import { PlusOutlined, SettingOutlined, UserOutlined, MessageOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'
import { type IAIService} from '@/services/aiService'
const aiService = inject<IAIService>('aiService')!
import robotImg from '@/assets/icons/robots.png'

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

// const robotImg = import.meta.glob('../assets/icons/robots.png')

// 响应式数据
const activeConversationKey = ref('conv-1')
const isTyping = ref(false)
const senderValue = ref('')
const chatMessagesRef = ref<HTMLElement>()

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
  // 切换对话后自动滚动到底部
  scrollToBottom()
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

  // 添加用户消息后自动滚动到底部
  scrollToBottom()

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
          // AI消息开始时自动滚动
          scrollToBottom()
        } else if (aiMessageAdded) {
          // 如果已经添加到列表中，直接更新响应式数组中的对象
          const currentMessages = messageStorage[activeConversationKey.value]
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += chunk
            // AI消息更新时也自动滚动
            scrollToBottom()
          }
        }
      }
    )

    // 如果没有收到����何内容，添加错误消息
    if (!aiMessageAdded) {
      aiMessage.content = '抱歉，没有收到回复，请重试。'
      messageStorage[activeConversationKey.value].push(aiMessage)
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    // 如果流��请求失败，显示错误信息
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

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    const chatMessages = document.querySelector('.chat-messages')
    if (chatMessages) {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时��`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString()
}

// 处理菜单点击
const handleMenuClick = (e: { key: string }, conversationKey: string) => {
  if (e.key === 'delete') {
    deleteConversation(conversationKey)
  }
}
</script>

<style lang="scss" scoped>
.chat-container {
  display: grid;
  grid-template-columns: 290px 1fr;
  grid-template-rows: 1fr;
  gap: 16px;
  height: 100vh;
  width: 100vw;
  padding: 16px;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #cbd5e1 100%);
  position: relative;
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0),
      linear-gradient(rgba(99, 102, 241, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 102, 241, 0.02) 1px, transparent 1px);
    background-size: 25px 25px, 25px 25px, 25px 25px;
    z-index: 0;
  }

  // 添加科技感光晕效果
  &::after {
    content: '';
    position: absolute;
    top: 20%;
    right: 15%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    animation: float 8s ease-in-out infinite;
    z-index: 0;
  }

  .sidebar {
    grid-column: 1;
    grid-row: 1;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
    border-radius: 24px;
    box-shadow:
      0 8px 32px rgba(99, 102, 241, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.2);
    overflow: hidden;

    &-brand {
      display: flex;
      align-items: center;
      padding: 20px 20px 16px 20px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.08);

      .brand-logo {
        display: flex;
        align-items: center;

        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          padding: 8px;
          background: rgba(99, 102, 241, 0.1);
          margin-right: 4px;
          box-shadow:
              0 8px 32px rgba(99, 102, 241, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .brand-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      }
    }

    &-header {
      padding: 20px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.08);

      :deep(.ant-btn-primary) {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none;
        border-radius: 16px;
        height: 48px;
        font-weight: 600;
        font-size: 15px;
        box-shadow:
          0 4px 16px rgba(99, 102, 241, 0.3),
          0 1px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(99, 102, 241, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .conversations-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;

      // 自定义滚动条
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(99, 102, 241, 0.05);
        border-radius: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.2);
        border-radius: 6px;

        &:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      }

      .conversations-title {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 12px 16px 12px;
        font-size: 14px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 8px;

        .anticon {
          font-size: 16px;
          color: #6366f1;
        }
      }

      .conversations-list {
        .conversation-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          margin-bottom: 8px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.08);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            transform: scaleY(0);
            transition: transform 0.3s ease;
            border-radius: 0 4px 4px 0;
          }

          &:hover {
            background: rgba(99, 102, 241, 0.05);
            transform: translateY(-2px);
            border-color: rgba(99, 102, 241, 0.15);
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);

            .conversation-actions {
              opacity: 1;
            }
          }

          &.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);

            &::before {
              transform: scaleY(1);
            }

            .conversation-content {
              .conversation-title {
                color: #334155;
                font-weight: 600;
              }
            }
          }

          .conversation-content {
            flex: 1;
            min-width: 0;

            .conversation-title {
              font-size: 14px;
              font-weight: 500;
              color: #475569;
              margin-bottom: 4px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.4;
            }

            .conversation-time {
              font-size: 12px;
              color: #94a3b8;
              font-weight: 400;
            }
          }

          .conversation-actions {
            opacity: 0;
            transition: opacity 0.3s ease;
            margin-left: 12px;

            .action-btn {
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: none;
              background: rgba(99, 102, 241, 0.1);
              border-radius: 8px;
              color: #6366f1;
              transition: all 0.3s ease;

              &:hover {
                background: rgba(99, 102, 241, 0.15);
                color: #4f46e5;
                transform: scale(1.1);
              }

              .anticon {
                font-size: 12px;
              }
            }
          }
        }
      }
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(99, 102, 241, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 0 0 24px 24px;

      .user-info {
        display: flex;
        align-items: center;

        .user-avatar {
          font-size: 20px;
          line-height: 20px;
          color: #6366f1;
          margin-right: 12px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 12px;
          padding: 8px;
        }

        .user-details {
          .user-name {
            font-size: 16px;
            font-weight: 600;
            color: #334155;
          }

          .user-status {
            font-size: 12px;
            color: #22c55e;
            font-weight: 500;
          }
        }
      }
    }
  }

  .main-content {
    grid-column: 2;
    grid-row: 1;
    display: grid;
    grid-template-rows: auto 1fr;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    position: relative;
    z-index: 1;
    border-radius: 24px;
    box-shadow:
      0 8px 32px rgba(99, 102, 241, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);

    .chat-header {
      grid-row: 1;
      padding: 24px 28px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.02), rgba(139, 92, 246, 0.02));
    }

    .chat-content {
      grid-row: 2;
      display: grid;
      grid-template-rows: 1fr auto;
      overflow: hidden;
      position: relative;

      .chat-messages {
        grid-row: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;

        // 自定义滚动条
        &::-webkit-scrollbar {
          width: 8px;
        }

        &::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.3);
          border-radius: 4px;

          &:hover {
            background: rgba(102, 126, 234, 0.5);
          }
        }

        .message-item {
          margin-bottom: 16px;
          animation: fadeInUp 0.5s ease-out;

          // 优化气泡样式
          :deep(.ant-bubble) {
            .ant-bubble-content {
              border-radius: 16px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
              border: 1px solid rgba(0, 0, 0, 0.06);
              backdrop-filter: blur(10px);
            }

            .ant-bubble-avatar {
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              border: 2px solid rgba(255, 255, 255, 0.8);
            }
          }
        }
      }

      .sender-area {
        grid-row: 2;
        padding: 24px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(248, 250, 252, 0.9));
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(99, 102, 241, 0.08);

        // 优化发送器��式
        :deep(.ant-sender) {
          border-radius: 20px;
          border: 2px solid rgba(99, 102, 241, 0.4);
          box-shadow:
            0 4px 24px rgba(99, 102, 241, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.04);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;

          // 动态边框环绕效果
          &::before {
            content: '';
            position: absolute;
            top: -1px;
            left: -1px;
            right: -1px;
            bottom: -1px;
            background: linear-gradient(90deg,
              #6366f1, #8b5cf6, #ec4899, #f59e0b,
              #10b981, #06b6d4, #6366f1, #8b5cf6);
            background-size: 300% 100%;
            border-radius: 21px;
            z-index: -1;
            opacity: 0;
            transition: opacity 0.3s ease;
            animation: borderFlow 4s linear infinite;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: xor;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            padding: 2px;
          }

          &:hover, &:focus-within {
            border-color: rgba(99, 102, 241, 0.6);
            box-shadow:
              0 8px 32px rgba(99, 102, 241, 0.25),
              0 4px 16px rgba(0, 0, 0, 0.08);
            transform: translateY(-2px);

            &::before {
              opacity: 1;
            }
          }

          .ant-input {
            background: transparent;
            border: none;
            font-size: 15px;
            line-height: 1.6;

            &::placeholder {
              color: rgba(100, 116, 139, 0.6);
              font-style: italic;
            }
          }

          .ant-btn-primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none;
            border-radius: 16px;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

            &:hover {
              transform: scale(1.05);
              box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            }

            &:active {
              transform: scale(0.98);
            }

            &:disabled {
              opacity: 0.6;
              transform: none;
            }
          }
        }
      }

      .tips {
        grid-row: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #64748b;
        font-weight: 600;
        font-size: 20px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: pulse 3s ease-in-out infinite;
      }
    }
  }
}

// 动画定义
@keyframes moveGrid {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(25px, 25px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.7;
  }
  25% {
    transform: translateY(-10px) rotate(1deg);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-20px) rotate(-1deg);
    opacity: 1;
  }
  75% {
    transform: translateY(-10px) rotate(0.5deg);
    opacity: 0.9;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}

@keyframes borderFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

// 响应式设计 - 基于 Grid 优化
@media (max-width: 1024px) {
  .chat-container {
    grid-template-columns: 260px 1fr;
    gap: 12px;
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .chat-container {
    grid-template-columns: 240px 1fr;
    gap: 8px;
    padding: 8px;

    .sidebar {
      border-radius: 16px;
    }

    .main-content {
      border-radius: 16px;
    }
  }
}

@media (max-width: 640px) {
  .chat-container {
    grid-template-columns: 1fr;
    grid-template-rows: 200px 1fr;
    gap: 8px;
    padding: 8px;

    .sidebar {
      grid-column: 1;
      grid-row: 1;
      border-radius: 16px;

      .conversations-wrapper {
        padding: 8px;
      }
    }

    .main-content {
      grid-column: 1;
      grid-row: 2;
      border-radius: 16px;
    }
  }
}

@media (max-width: 480px) {
  .chat-container {
    padding: 4px;
    gap: 4px;

    .sidebar {
      .sidebar-brand .brand-logo .logo-icon {
        font-size: 24px;
        padding: 6px;
      }

      .sidebar-brand .brand-logo .brand-text {
        font-size: 18px;
      }

      .sidebar-header {
        padding: 16px;

        :deep(.ant-btn-primary) {
          height: 44px;
          font-size: 14px;
        }
      }
    }

    .main-content {
      .chat-header {
        padding: 16px 20px;

        :deep(.ant-btn) {
          height: 36px;
          font-size: 14px;
        }
      }

      .chat-content {
        .chat-messages {
          padding: 16px;
        }

        .sender-area {
          padding: 16px;

          :deep(.ant-sender) {
            border-radius: 16px;

            .ant-btn-primary {
              width: 44px;
              height: 44px;
            }
          }
        }
      }
    }
  }
}
</style>
