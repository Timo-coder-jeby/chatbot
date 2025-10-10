<script setup lang="ts">
import type {IAIService} from "@/services/aiService.ts";

const aiService = inject<IAIService>('aiService')!

import {inject, onBeforeUnmount, reactive, watch,computed} from 'vue'
import Creator from './CtrComp/Creator.vue'
import Rules from './CtrComp/rules.vue'
import {message} from "ant-design-vue";

import rules from './rules.json'

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
const emit = defineEmits<{
  'conversation-change': [key: string]
  'changeLoading': [key: boolean]
}>()
const APIBASE = import.meta.env.VITE_APP_FILE_URL

const createInitialUploadStatus = () => ({
  fileId: '',
  uploaded: false,
  progress: 0,
  procText: '',
  dots: '',
  interval: null as any,
  originFile: null as any
})

let uploadStatus = reactive(createInitialUploadStatus())

// 计算是否为新会话
const isNewConversation = computed(() => {
  return props.activeConversationKey.startsWith('conv-')
})

// 计算当前会话
const currentConversation = computed(() => {
  return props.conversationList.find(item => item.key === props.activeConversationKey)
})

const resetDefaultValue = () => {
  Object.assign(uploadStatus,createInitialUploadStatus())
}

const loadHistoryResults = async () => {
  if (!currentConversation.value?.sessionKey) return
  try {
    emit('changeLoading', true)
    // 获取历史会话消息
    const response = await aiService.post(
      `/chat/session/messages`,
      {
        sessionId: currentConversation.value.sessionKey,
      }
    )
    console.log('🐭',response);
    if(response?.attachments) {
      uploadStatus.fileId = response?.attachments[0]?.fileId
      uploadStatus.originFile = {
        originFileObj: `${APIBASE}${response?.attachments[0]?.previewUrl}`,
        status: 'done',
        percent: 100,
        name: response?.attachments[0]?.fileName,
      }
    }

  } catch (error) {
    console.error('加载历史搜索结果失败:', error)
  } finally {
    emit('changeLoading', false)
  }
}

// 监听会话变化，如果是历史会话则加载搜索结果
watch(() => props.activeConversationKey, async () => {
  if (!isNewConversation.value && currentConversation.value?.sessionKey) {
    resetDefaultValue()
    await loadHistoryResults()
  } else {
    resetDefaultValue()
  }
},{ immediate: false})

const startProgress = (text = '分析中') => {
  uploadStatus.procText = text
  uploadStatus.progress = 0
  if (uploadStatus.interval) {
    clearInterval(uploadStatus.interval)
    uploadStatus.interval = null
  }
  uploadStatus.interval = setInterval(() => {
    // 进度递增到80时暂停并请求接口
    if (uploadStatus.progress < 100) {
      uploadStatus.progress += Math.floor(Math.random() * 10) + 1
      if (uploadStatus.progress >= 100) {
        uploadStatus.progress = 100
        clearInterval(uploadStatus.interval)
        uploadStatus.interval = null
      }
    }
    let dotCount = (uploadStatus.dots.length + 1) % 4
    uploadStatus.dots = '.'.repeat(dotCount)
  }, 300)
}

const rulesProp = computed(() => ({
  ...uploadStatus?.originFile ?? {},
  fileId: uploadStatus?.fileId,
  // ruleTaskId: ruleList?.value?.ruleTaskId
}))

const uploadChange = (file:any) => {
  uploadStatus.uploaded = true
  console.log('👽',file);
  uploadStatus.originFile = file
  uploadStatus.fileId = file?.response?.data?.fileId ?? file?.response?.data ?? ''
  if (isNewConversation.value) {
    props.conversationList[0] = {
      key: file?.response?.data?.fileId,
      label: file?.response?.data?.fileName,
      sessionKey: file?.response?.data?.sessionId,
      timestamp: new Date().getTime(),
    }
    emit('conversation-change', props.conversationList[0].key)
  }
  startProgress()
}
onBeforeUnmount(() => {
  if (uploadStatus.interval) {
    clearInterval(uploadStatus.interval)
    uploadStatus.interval = null
  }
})

</script>

<template>
  <div class="grid row-span-2 relative">
    <template v-if="!uploadStatus?.fileId">
<!--    <template v-if="!uploadStatus.originFile">-->
      <div class="absolute top-0 z-20 w-full h-full p-4" v-if="uploadStatus.uploaded">
        <p class="text-xs text-gray-400">分析中{{ uploadStatus.dots }}</p>
        <a-progress
          :stroke-color="{
          '0%': '#108ee9',
          '100%': '#87d068',
        }"
          :percent="uploadStatus.progress"
        />
      </div>
      <Creator
        @change="uploadChange"
      />
    </template>
    <Rules
      v-else
      :file="rulesProp"
    />
  </div>
</template>

<style scoped lang="scss">

</style>