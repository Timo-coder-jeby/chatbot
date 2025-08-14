<script setup lang="ts">
import ChatBot from '@/components/Chatbot/index.vue'

// 配置红色主题
const theme = {
  token: {
    colorPrimary: '#ff4d4f', // 红色主题色
  },
}
</script>

<template>
  <a-config-provider :theme="theme">
    <ChatBot />
  </a-config-provider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
