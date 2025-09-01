<script setup lang="ts">
import type {IAIService} from "@/services/aiService.ts";

const aiService = inject<IAIService>('aiService')!

import {inject, onBeforeUnmount, reactive, ref} from 'vue'
import Creator from './CtrComp/Creator.vue'
import Rules from './rules.vue'
import {message} from "ant-design-vue";

import rules from './rules.json'

const uploadStatus = reactive({
  fileId: '',
  uploaded: false,
  progress: 0,
  procText: '',
  dots: '',
  interval: null as any,
  originFile: null as any
})

const ruleList:any = ref()

const startProgress = (text = '分析中') => {
  uploadStatus.procText = text
  uploadStatus.progress = 0
  if (uploadStatus.interval) {
    clearInterval(uploadStatus.interval)
    uploadStatus.interval = null
  }
  uploadStatus.interval = setInterval(() => {
    // 进度递增到80时暂停并请求接口
    if (uploadStatus.progress < 90) {
      uploadStatus.progress += Math.floor(Math.random() * 10) + 1
      if (uploadStatus.progress >= 90) {
        uploadStatus.progress = 90
        clearInterval(uploadStatus.interval)
        uploadStatus.interval = null
        getRules()
      }
    }
    let dotCount = (uploadStatus.dots.length + 1) % 4
    uploadStatus.dots = '.'.repeat(dotCount)
  }, 300)
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
      ruleList.value = {
        ruleTaskId: res?.output?.ruleTaskId,
        rules: res?.output?.rules?.map((vo:any) => ({...vo,checked: 1})) ?? []
      }
      uploadStatus.progress = 100
      // dots继续动态
      if (!uploadStatus.interval) {
        uploadStatus.interval = setInterval(() => {
          let dotCount = (uploadStatus.dots.length + 1) % 4
          uploadStatus.dots = '.'.repeat(dotCount)
        }, 300)
      }
      // 进度到100后清理定时器
      setTimeout(() => {
        if (uploadStatus.interval) {
          clearInterval(uploadStatus.interval)
          uploadStatus.interval = null
        }
      }, 500)
    })
}

const uploadChange = (file:any) => {
  uploadStatus.uploaded = true
  console.log('👽',file);
  uploadStatus.originFile = file
  uploadStatus.fileId = file?.response?.data ?? ''
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
    <template v-if="!ruleList">
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
      :file="uploadStatus?.originFile"
      :ruleList="ruleList?.rules"
    />
  </div>
</template>

<style scoped lang="scss">

</style>