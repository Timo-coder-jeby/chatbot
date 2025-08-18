import axios, {type Axios} from 'axios'

// AI 服务配置
interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}


// AI 响应类型
interface AIResponse {
  data?: string
  params?: any
  type?: string
  error?: string
  sessionId?: string
}

type StreamParams = {
  sessionId: string,
  question: string,
  role?: string
}

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
  isTyping?: boolean
}

// AI 服务接口约束
interface IAIService {
  createMessage(type?: string): Promise<AIResponse>
  sendMessageStream(
    url?: string,
    data?: StreamParams,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal,
    apiType?: 'stream' | 'ajax'
  ): Promise<AIResponse>
  get: (url: string, params?: any, cof?: any) => Promise<any>
  post: (url: string, data?: any, cof?: any) => Promise<any>
  del: (url: string, params?: any, cof?: any) => Promise<any>
  put: (url: string, data?: any, cof?: any) => Promise<any>
}

class AIService implements IAIService {
  private config: AIConfig
  public service: Axios
  constructor(config: AIConfig) {
    this.config = config
    this.service = axios
  }

  // 创建新会话
  async createMessage(type?: string): Promise<AIResponse> {
    try {
      // 这里可以替换为不同的 AI 服务 (OpenAI, Claude, 本地模型等)
      const response = await axios.get(
        `${this.config.baseURL}/new-session`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30秒超时
          params: {type}
        }
      )
      return response.data.data ?? response?.data
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

  // 统一的消息发送方法，根据apiType区分流式和普通请求
  async sendMessageStream(
    url: string = '/post/stream/flux1',
    data: StreamParams,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal,
    apiType: 'stream' | 'ajax' = 'stream'
  ): Promise<AIResponse> {
    try {
      if (apiType === 'ajax') {
        // 普通AJAX请求模式
        return await this.sendAjaxRequest(url, data, signal)
      } else {
        // 流式请求模式
        return await this.sendStreamRequest(url, data, onChunk, signal)
      }
    } catch (error: any) {
      console.error('请求失败:', error)

      if (error.name === 'AbortError') {
        throw error
      }

      return {
        data: '抱歉，服务暂时不可用，请稍后重试。',
        error: error.message
      }
    }
  }

  // 普通AJAX请求方法
  private async sendAjaxRequest(
    url: string,
    data: StreamParams,
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch(`${this.config.baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({...data, role: '云流智能法律机器人'}),
      signal
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('🫡',{
      data: result.data || result,
      params: data,
      type: 'ajax'
    })
    // 直接返回接口返回的data
    return {
      data: result.data || result,
      params: data,
      type: 'ajax'
    }
  }

  // 流式请求方法
  private async sendStreamRequest(
    url: string,
    data: StreamParams,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch(`${this.config.baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({...data, role: '云流智能法律机器人'}),
      signal
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
        if (signal?.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError')
        }

        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // 按行分割处理
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue

          // 移除 data: 前缀
          let content = line.startsWith('data:') ? line.slice(5) : line
          if (!content.trim()) continue

          try {
            // 解析JSON
            const parsedData = JSON.parse(content)

            // 兼容两种数据格式
            if (
              (parsedData.type == 'ai_message' || parsedData.type == 'legal_advice_data')
              && parsedData.message
            ) {
              // 新格式：直接从 message 字段获取文本
              const text = parsedData.message
              fullContent += text
              onChunk?.(text)
            } else if (parsedData.event_type === 2001 && parsedData.event_data) {
              // 原格式：复杂的嵌套JSON结构
              const eventData = JSON.parse(parsedData.event_data)

              if (eventData.is_delta === true && eventData.message?.content) {
                const messageContent = JSON.parse(eventData.message.content)

                if (messageContent.text) {
                  const text = messageContent.text
                  fullContent += text
                  onChunk?.(text)
                }
              }
            }
            // 忽略其他类型的事件 (如 start, complete 等)

          } catch (parseError) {
            // 如果JSON解析失败，跳过这行
            console.warn('JSON解析失败:', parseError, 'content:', content)
            continue
          }
        }
      }

      return {
        data: fullContent,
        type: 'stream'
      }
    } finally {
      reader.releaseLock()
    }
  }

  get(url: string,params?:any,cof?:any):Promise<any>{
    return new Promise((resolve) => {
      this.service.get(url,{params,...cof})
        .then((resp:any) => resolve(resp?.data?.data || resp?.data))
        .catch((error) => resolve(error))
    })
  }
  post(url: string,data?:any,cof?:any):Promise<any>{
    return new Promise((resolve) => {
      this.service.post(url,data,cof)
        .then((resp:any) => resolve(resp.data || resp?.data))
        .catch((error:any) => resolve(error))
    })
  }
  del(url: string,params?:any,cof?:any):Promise<any>{
    return new Promise((resolve) => {
      this.service.delete(url,{params,...cof})
        .then((resp:any) => resolve(resp?.data?.data || resp?.data))
        .catch((error:any) => resolve(error))
    })
  }
  put(url: string,data?:any,cof?:any):Promise<any>{
    return new Promise((resolve) => {
      this.service.put(url,data,cof)
        .then((resp:any) => resolve(resp?.data?.data || resp?.data))
        .catch((error:any) => resolve(error))
    })
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

export {
  AIService,
  type AIResponse,
  type IAIService,
  type ConversationItem,
  type MessageItem
}
