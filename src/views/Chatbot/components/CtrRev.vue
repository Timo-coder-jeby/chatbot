<script setup lang="ts">
import {onBeforeUnmount, reactive, ref} from 'vue'
import Creator from './CtrComp/Creator.vue'
const uploadStatus = reactive({
  uploaded: false,
  progress: 0,
  dots: '',
  interval: null as any
})

const uploadChange = (file:any) => {
  uploadStatus.uploaded = true
  uploadStatus.progress = 0
  let dotCount = 0

  uploadStatus.interval = setInterval(() => {
    if (uploadStatus.progress < 100) {
      dotCount = (dotCount + 1) % 4
      uploadStatus.dots = '.'.repeat(dotCount)
      uploadStatus.progress += 10
    }
  }, 500)
}
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