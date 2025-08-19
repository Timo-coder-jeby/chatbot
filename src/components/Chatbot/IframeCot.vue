<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  url?: string
  visible?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  url: '',
  visible: false,
  title: 'External Link'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const iframeRef = ref<HTMLIFrameElement>()
const currentUrl = ref(props.url)

// 监听URL变化
watch(() => props.url, (newUrl) => {
  if (newUrl) {
    currentUrl.value = newUrl
  }
})

// 关闭iframe
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 刷新iframe
const handleRefresh = () => {
  if (iframeRef.value) {
    iframeRef.value.src = currentUrl.value
  }
}

// 在新窗口打开
const openInNewWindow = () => {
  if (currentUrl.value) {
    window.open(currentUrl.value, '_blank')
  }
}
</script>

<template>
  <transition name="slide-right">
    <div v-if="visible" class="iframe-overlay">
      <!-- 简化的头部工具栏 -->
      <div class="iframe-header">
        <div class="iframe-actions">
          <button @click="handleRefresh" class="action-btn refresh-btn" title="刷新">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 2v6h6m2 13a9 9 0 1 1 0-18 9 9 0 0 1 9 9 9 9 0 0 1-9 9z"/>
            </svg>
          </button>
          <button @click="handleClose" class="action-btn close-btn" title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- iframe内容 -->
      <div class="iframe-content">
        <iframe
          ref="iframeRef"
          :src="currentUrl"
          :title="title"
          class="iframe-frame"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          @load="handleIframeLoad"
        ></iframe>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
// 右侧滑入动画
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

.iframe-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: white;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.iframe-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  min-height: 60px;
}

.iframe-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgb(44, 121, 241);
    transform: scale(1.1);
  }
}

.iframe-content {
  flex: 1;
  overflow: hidden;
}

.iframe-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

// 响应式设计
@media (max-width: 768px) {
  .iframe-overlay {
    width: 100%;
  }
}

@media (max-width: 1200px) {
  .iframe-overlay {
    width: 60%;
  }
}
</style>