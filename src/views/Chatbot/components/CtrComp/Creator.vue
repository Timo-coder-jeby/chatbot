<script setup lang="ts">
import { ref } from 'vue'
import { message } from "ant-design-vue";
import { CloudUploadOutlined } from "@ant-design/icons-vue";

const emit = defineEmits<{
  'change': [file: any]
}>()

const fileList = ref([])
const BASEURL = import.meta.env.VITE_APP_BASE_API

const uploadChange = ({file}:any) => {
  if (file.status === 'done'){
    message.success('合同上传成功')
    emit('change', file)
  }
}
const onDrop = (e:any) => {
  console.log('Dropped files', e.dataTransfer.files);
}

</script>

<template>
  <div class="flex-1 overflow-hidden p-[25vh_80px_0]">
    <div class="mb-[5vh]">
      <h2 class="font-semibold text-center">一键开启智能审查</h2>
      <p class="text-gray-400 text-center">快速识别潜在风险,提供更为专业的优化建议</p>
    </div>
    <div>

      <a-upload-dragger
        v-model:fileList="fileList"
        :action="BASEURL + '/chat/farui/data/textFile'"
        @change="uploadChange"
        :maxCount="1"
        @drop="onDrop"
      >
        <div class="mt-4 w-[50px] h-[50px] rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto drop-shadow-xl">
          <CloudUploadOutlined class="text-2xl text-white"/>
        </div>
        <p class="text-sm font-semibold my-3">点击或将文档拖拽到此处上传</p>
        <p class="text-xs text-gray-400 mb-4">单个合同文件的字数不超过20万字，格式支持：pdf/doc/docx</p>
      </a-upload-dragger>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>