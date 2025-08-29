<script setup lang="ts">
import type {IAIService} from "@/services/aiService.ts";

const aiService = inject<IAIService>('aiService')!

import {inject, onBeforeUnmount, reactive, watch} from 'vue'
import Creator from './CtrComp/Creator.vue'
import {message} from "ant-design-vue";
const uploadStatus = reactive({
  fileId: '',
  uploaded: false,
  progress: 0,
  procText: '',
  dots: '',
  interval: null as any
})

const startProgress = (text = '分析中') => {
  uploadStatus.procText = text
  uploadStatus.progress = 0
  uploadStatus.interval = setInterval(() => {
    if (uploadStatus.progress < 90) {
      uploadStatus.progress += Math.floor(Math.random() * 10) + 1
    } else if (uploadStatus.progress < 100) {
      uploadStatus.progress += 1
    } else {
      clearInterval(uploadStatus.interval)
      uploadStatus.interval = null
    }
    let dotCount = (uploadStatus.dots.length + 1) % 4
    uploadStatus.dots = '.'.repeat(dotCount)
  }, 300)
}
const uploadChange = (file:any) => {
  uploadStatus.uploaded = true
  uploadStatus.fileId = file?.response?.data ?? ''
  startProgress()
}
const getRules = () => {
  if (!uploadStatus?.fileId) {
    message.warning('文件故障,请重新上传!')
    return
  }
  aiService.post('/chat/farui/contract/rule/generate',{
    assistant: {
      metaData: {
        fileId: uploadStatus?.fileId,
        position: '1'
      }
    }
  })
    .then(res => {

    })
}

watch(() => uploadStatus.progress, (newVal) => {
  if (newVal >= 100) getRules()
})

onBeforeUnmount(() => {
  if (uploadStatus.interval) {
    clearInterval(uploadStatus.interval)
  }
})

</script>

<template>
  <div class="grid row-span-2 relative">
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
  </div>
</template>

<style scoped lang="scss">

</style>