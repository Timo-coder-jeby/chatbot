import axios from 'axios'

// AI 服务配置
interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}


// AI 响应类型
interface AIResponse {
  data?: string
  error?: string
}

type StreamParams = {
  sessionId: string,
  question: string,
  role?: string
}
// AI 服务接口约束
interface IAIService {
  createMessage(): Promise<AIResponse>
  sendMessageStream(
    data: StreamParams,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse>
}

class AIService implements IAIService {
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  // 创建新会话
  async createMessage(): Promise<AIResponse> {
    try {
      // 这里可以替换为不同的 AI 服务 (OpenAI, Claude, 本地模型等)
      const response = await axios.get(
        `${this.config.baseURL}/new-session`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      )

      const aiMessage = response.data.data ?? response?.data

      return {
        data: aiMessage
      }
    } catch (error: any) {
      console.error('AI服务请求失败:', error)

      let errorMessage = '服务暂时不可用，请稍后重试。'

      if (error.response?.status === 401) {
        errorMessage = 'API密钥无效，请检查配置。'
      } else if (error.response?.status === 429) {
        errorMessage = '请求过于频繁，请稍后重试。'
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接。'
      }

      return {
        data: errorMessage,
        error: error.message
      }
    }
  }

  // 流式响应
  async sendMessageStream(
    data: StreamParams,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/post/stream/flux`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({...data,role: '云流智能法律机器人'})
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.trim() === '') continue

            // 处理SSE格式的流式响应
            let content = ''

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]' || data === '') continue

              try {
                // 尝试解析为JSON格式
                const parsed = JSON.parse(data)
                content = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text || ''
              } catch (e) {
                // 如果不是JSON格式，检查是否包含多个data:前缀
                if (data.includes('data:')) {
                  // 移除所有data:前缀，只保留实际内容
                  content = data.replace(/data:/g, '')
                } else {
                  content = data
                }
              }
            } else if (!line.startsWith('event:') && !line.startsWith('id:') && !line.startsWith('retry:')) {
              // 处理非SSE格式的普通文本流
              // 也要检查是否包含data:前缀
              if (line.includes('data:')) {
                content = line.replace(/data:/g, '')
              } else {
                content = line
              }
            }

            if (content && content.trim()) {
              fullContent += content
              // 实时回调每个chunk
              onChunk?.(content)
            }
          }
        }

        return {
          data: fullContent
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error: any) {
      console.error('流式请求失败:', error)
      return {
        error: error.message
      }
    }
  }
}

// 创建默认 AI 服务实例
export const createAIService = (config?: Partial<AIConfig>) => {
  const defaultConfig: AIConfig = {
    apiKey: import.meta.env.VITE_AI_API_KEY || '',
    baseURL: import.meta.env.VITE_AI_BASE_URL || '/chat',
    model: import.meta.env.VITE_AI_MODEL,
    ...config
  }

  return new AIService(defaultConfig)
}

export { AIService, type AIResponse,type IAIService }
