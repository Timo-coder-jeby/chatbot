<template>
  <div class="chat-content">
    <!-- 聊天消息区域 -->
    <div class="chat-messages" v-if="messages.length > 0" ref="chatMessagesRef">
      <div v-for="message in messages" :key="message.key" class="message-item">
        <!-- 用户消息使用普通文本 -->
        <AXBubble
          v-if="message.role === 'user'"
          :placement="'end'"
          :content="message.content"
          :avatar="{
            icon: h(UserOutlined),
            style:{
              backgroundColor: '#00b96b',
              color: '#fff'
            }
          }"
          :styles="{
            content: {
              backgroundColor: '#b7eb8f',
            }
          }"
        />
        <!-- AI消息使用Markdown渲染 -->
        <AXBubble
          v-else
          :placement="'start'"
          :content="message.content"
          :messageRender="renderMarkdown"
          :avatar="{ src: robotImg }"
          :styles="{
            content: {
              backgroundColor: '#fff',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
          v-model:value="inputValue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h, nextTick, watch } from 'vue'
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

// 监听外部传入的 senderValue 变化
watch(() => props.senderValue, (newValue) => {
  inputValue.value = newValue
})

// 监听内部 inputValue 变化，同步到外部
watch(inputValue, (newValue) => {
  emit('update:senderValue', newValue)
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

// 改进的 Markdown 渲染函数 - 确保正确处理换行
const renderMarkdown = (content: string) => {
  // 预处理内容，更智能地处理换行和格式
  let processedContent = content
    // 先保护代码块，避免被换行处理影响
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/\n/g, '___CODEBLOCK_NEWLINE___')
    })
    // 处理数字列表（1. 2. 3.）
    .replace(/(\d+)\.\s+/g, '\n\n$1. ')
    // 处理无序列表（- * +）
    .replace(/^([*+-])\s+/gm, '\n$1 ')
    // 处理标题
    .replace(/^(#{1,6})\s+/gm, '\n\n$1 ')
    // 处理段落分隔：将单个换行符转换为双换行符（但避免过多换行）
    .replace(/([^.\n])\n([^*+\d\n-])/g, '$1\n\n$2')
    // 清理多余的换行符
    .replace(/\n{3,}/g, '\n\n')
    // 恢复代码块中的换行符
    .replace(/___CODEBLOCK_NEWLINE___/g, '\n')
    // 确保开头和结尾没有多余的换行
    .trim()

  // 如果内容包含代码块标记，确保代码块前后有适当的换行
  if (processedContent.includes('```')) {
    processedContent = processedContent
      .replace(/([^\n])```/g, '$1\n\n```')
      .replace(/```([^\n])/g, '```\n\n$1')
  }

  const htmlContent = md.render(processedContent)

  // 对渲染后的HTML进行后处理，改善显示效果
  const postProcessedHtml = htmlContent
    // 为段落添加适当的间距
    .replace(/<p>/g, '<p style="margin: 0 0 12px 0; line-height: 1.6;">')
    // 为列表项添加适当的间距
    .replace(/<li>/g, '<li style="margin: 4px 0; line-height: 1.5;">')
    // 为代码块添加样式
    .replace(/<pre class="hljs">/g, '<pre class="hljs" style="margin: 16px 0; border-radius: 6px; overflow-x: auto;">')

  console.log('处理后的内容:', processedContent)
  console.log('渲染后的HTML:', postProcessedHtml)

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
  scrollToBottom
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

          hr {
            margin: 24px 0;
            border: none;
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
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

</style>
