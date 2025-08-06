<template>
  <div class="chat-content">
    <!-- 聊天消息区域 -->
    <div class="chat-messages" v-if="allMessages.length > 0" ref="chatMessagesRef">
      <div v-for="message in allMessages" :key="message.key" class="message-item">
        <AXBubble
          :placement="message.role === 'user' ? 'end' : 'start'"
          :content="message.content"
          :messageRender="message.role === 'assistant' ? renderMarkdown : undefined"
          :typing="message.isTyping"
          :avatar="message.role === 'user' ? {
            icon: h(UserOutlined),
            style: {
              backgroundColor: '#00b96b',
              color: '#fff'
            }
          } : { src: robotImg }"
          :styles="{
            content: {
              backgroundColor: message.role === 'user' ? '#b7eb8f' : '#fff',
              padding: '16px',
              border: message.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
              borderRadius: '12px',
              boxShadow: message.role === 'assistant' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }
          }"
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
          v-model:value="inputValue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h, nextTick, watch, computed } from 'vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { type MessageItem } from '@/services/aiService.ts'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import robotImg from '@/assets/icons/robots.png'

type Props = {
  messages: MessageItem[];
  isTyping: boolean;
  senderValue: string;
}

const props = defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'send-message': [message: string]
  'update:senderValue': [value: string]
}>()

const chatMessagesRef = ref<HTMLElement>()
const inputValue = ref(props.senderValue)
const currentAIContent = ref('')

// 统一的消息列表 - 包含正常消息和typing状态
const allMessages = computed(() => {
  const result = [...props.messages]

  // 如果正在打字，添加一个typing消息
  if (props.isTyping) {
    // 检查最后一个消息是否是 AI 消消息，如果是则不添加新的 typing 消息
    const lastMessage = result[result.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      // 如果最后一个消息是 AI 消息，说明正在流式输出，不需要额外的 typing 气泡
      return result
    }

    // 只有在没有 AI 消息正在输出时才显示 typing 气泡
    result.push({
      key: 'ai-typing',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isTyping: true
    } as MessageItem & { isTyping: boolean })
  }

  return result
})

// 监听外部传入的 senderValue 变化
watch(() => props.senderValue, (newValue) => {
  inputValue.value = newValue
})

// 监听内部 inputValue 变化，同步到外部
watch(inputValue, (newValue) => {
  emit('update:senderValue', newValue)
})

// 监听 typing 状态变化，重置 AI 内容
watch(() => props.isTyping, (newVal) => {
  if (!newVal) {
    currentAIContent.value = ''
  }
})

// 暴露方法给父组件更新 AI 内容
const updateAIContent = (content: string) => {
  currentAIContent.value = content
}

// 计算属性：判断当前消息列表中是否有AI消息
const hasAIMessage = computed(() => {
  return props.messages.some(message => message.role === 'assistant')
})

// 配置 markdown-it
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // 启用换行转换
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})

// 改进的 Markdown 渲染函数 - 优化版本
const renderMarkdown = (content: string) => {
  // 预处理内容，智能处理换行和格式
  let processedContent = content
    // 先保护代码块，避免被换行处理影响
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/\n/g, '___CODEBLOCK_NEWLINE___')
    })
    // 处理段落分隔：将单个换行符转换为双换行符（创建段落分隔）
    .replace(/([^\n])\n([^\n*+\d-])/g, '$1\n\n$2')
    // 清理多余的换行符（最多保留两个连续换行）
    .replace(/\n{3,}/g, '\n\n')
    // 恢复代码块中的换行符
    .replace(/___CODEBLOCK_NEWLINE___/g, '\n')
    // 确保开头和结尾没有多余的换行
    .trim()

  // 渲�� Markdown 为 HTML
  const htmlContent = md.render(processedContent)

  // 对渲染后的HTML进行后处理，改善显示效果
  const postProcessedHtml = htmlContent
    // 移除 HR 标签
    .replace(/<hr\s*\/?>/g, '')
    // 为段落添加适当的间距
    .replace(/<p>/g, '<p style="margin: 0 0 12px 0; line-height: 1.6;">')
    // 为列表项添加适当的间距
    .replace(/<li>/g, '<li style="margin: 4px 0; line-height: 1.5;">')
    // 为代码块添加样式
    .replace(/<pre class="hljs">/g, '<pre class="hljs" style="margin: 16px 0; border-radius: 6px; overflow-x: auto;">')

  return h('div', {
    innerHTML: postProcessedHtml,
    class: 'markdown-content',
    style: {
      lineHeight: '1.7',
      fontSize: '14px',
      wordBreak: 'break-word',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      color: '#333',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }
  })
}

// 处理发送消息
const handleSendMessage = (message: string) => {
  emit('send-message', message)
}

// 自动滚动到底部 - 暴露给父组件调用
const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTo({
        top: chatMessagesRef.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

// 监听消息变化，自动滚动
watch(() => props.messages, () => {
  scrollToBottom()
}, { deep: true })

// 监听打字状态变化，自动滚动
watch(() => props.isTyping, () => {
  if (props.isTyping) {
    scrollToBottom()
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  updateAIContent
})
</script>

<style scoped lang="scss">
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

        // Markdown 样式优化 - 直接针对渲染的div
        .markdown-content {
          line-height: 1.6;
          font-size: 14px;
          color: #374151;

          // 移除第一个元素的上边距和最后一个元素的下边距
          > *:first-child {
            margin-top: 0 !important;
          }

          > *:last-child {
            margin-bottom: 0 !important;
          }

          h1, h2, h3, h4, h5, h6 {
            margin: 20px 0 12px 0;
            color: #1f2937;
            font-weight: 600;
            line-height: 1.3;
          }

          h1 {
            font-size: 20px;
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }

          h2 {
            font-size: 18px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 16px;
          }

          h3 {
            font-size: 16px;
            margin-bottom: 14px;
            font-weight: 600;
          }

          h4, h5, h6 {
            font-size: 15px;
            margin-bottom: 12px;
            font-weight: 600;
          }

          p {
            margin: 0 0 14px 0;
            word-wrap: break-word;
            line-height: 1.7;
            color: #374151;
          }

          ul, ol {
            margin: 14px 0;
            padding-left: 24px;

            li {
              margin-bottom: 8px;
              line-height: 1.6;
            }
          }

          blockquote {
            margin: 18px 0;
            padding: 14px 18px;
            background: #f8fafc;
            border-left: 4px solid #6366f1;
            border-radius: 0 8px 8px 0;
            color: #64748b;
            font-style: italic;

            p {
              margin: 0;
            }
          }

          code {
            background: #f1f5f9;
            color: #fff;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            font-weight: 500;
          }

          pre {
            margin: 18px 0;
            border-radius: 8px;
            overflow-x: auto;
            background: #1e293b !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

            code {
              background: transparent;
              color: #fff;
              padding: 18px;
              display: block;
              border-radius: 8px;
              font-size: 13px;
              line-height: 1.5;
              font-weight: normal;

              &.hljs {
                color: #e2e8f0;
              }
            }
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            font-size: 14px;

            th, td {
              padding: 12px 16px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }

            th {
              background: #f8fafc;
              font-weight: 600;
              color: #374151;
            }

            tr:hover {
              background: #f8fafc;
            }

            tr:last-child {
              td {
                border-bottom: none;
              }
            }
          }

          a {
            color: #6366f1;
            text-decoration: none;
            transition: color 0.2s ease;
            font-weight: 500;

            &:hover {
              color: #4f46e5;
              text-decoration: underline;
            }
          }

          strong, b {
            font-weight: 600;
            color: #1f2937;
          }

          em, i {
            font-style: italic;
            color: #64748b;
          }

          // 特殊格式化样式 - 法律文档
          .legal-title {
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            margin: 24px 0;
            color: #1f2937;
          }

          .legal-section {
            margin: 18px 0;

            h4 {
              font-weight: 600;
              color: #374151;
              margin-bottom: 10px;
            }
          }
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

</style>
