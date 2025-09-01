<script setup lang="ts">
import VueOfficeDocx from '@vue-office/docx'
// import '@vue-office/docx/lib/index.css'
const props = withDefaults(
  defineProps<{
    fileUrl?: any
    fileType?: string
  }>(),
  {
    ruleList: () => [],
    fileType: 'docx'
  }
)
const options = {
  inWrapper: false,
  ignoreWidth: true,
  ignoreHeight: true,
  // ignoreLastRenderedPageBreak: true,
  breakPages: false
}
const onDocRendered = () => {
  console.log('文档渲染完成')
}
</script>

<template>
  <div class="col-span-1 w-full h-full overflow-y-auto bg-white">
    <VueOfficeDocx
      :src="fileUrl"
      style="height: 100%;width:100%"
      :options="options"
      @rendered="onDocRendered"
    />
  </div>
</template>

<style scoped lang="scss">

</style>