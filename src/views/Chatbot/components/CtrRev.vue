<script setup lang="ts">
import type {IAIService} from "@/services/aiService.ts";

const aiService = inject<IAIService>('aiService')!

import {inject, onBeforeUnmount, reactive, ref,computed} from 'vue'
import Creator from './CtrComp/Creator.vue'
import Rules from './CtrComp/rules.vue'
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