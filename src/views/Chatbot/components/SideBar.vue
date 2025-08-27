<script setup lang="ts">
import logo from '@/assets/icons/logo.png'
import { type ConversationItem } from '@/services/aiService.ts'

import {
  DeleteOutlined,
  MessageOutlined,
  PlusOutlined,
  SettingOutlined,
  UserOutlined,
  DownOutlined
} from "@ant-design/icons-vue";

type Props = {
  conversationList: ConversationItem[];
  activeConversationKey: string;
  techMenu: any[];
  curMenuIndex: number;
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'create-new-chat': []
  'conversation-change': [key: string]
  'delete-conversation': [key: string]
  'menu-change': [index: number]
}>()

// 创建新对话
const createNewChat = () => {
  emit('create-new-chat')
}

// 切换对话
const handleConversationChange = (key: string) => {
  emit('conversation-change', key)
}

// 删除对话
const deleteConversation = (key: string) => {
  emit('delete-conversation', key)
}

// 菜单切换事件
const handleMenuChange = (index: number) => {
  emit('menu-change', index)
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString()
}

// 处理菜单点击
const handleMenuClick = (e: any, conversationKey: string) => {
  if (e.key === 'delete') {
    deleteConversation(conversationKey)
  }
}
</script>

<template>
  <div class="bg-white/90 backdrop-blur-xl flex flex-col relative z-10 rounded-3xl shadow-2xl border border-red-100/30 overflow-hidden">
    <!-- 顶部品牌区域 -->
    <div class="flex items-center justify-center gap-2 px-6 py-5 border-b border-red-100/50 bg-gradient-to-br from-orange-50 via-red-50 to-pink-100">
      <a-avatar
        icon="云流"
        size="large"
        alt="云流智法 Logo"
        :src="logo"
      />
      <div class="flex items-center text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
        云流智法
      </div>
    </div>

    <!-- 简化的技术菜单选择器 -->
    <div class="px-6 py-4 border-b border-red-100/50">
      <a-dropdown
        :trigger="['click']"
        placement="bottomLeft"
        @click.stop
      >
        <a-button
          class="w-full h-10 text-left flex items-center justify-between border-red-200 hover:border-red-300 text-slate-700 hover:text-red-600 bg-white hover:bg-red-50 transition-colors duration-200"
        >
          <div class="flex items-center space-x-2">
            <component :is="techMenu[curMenuIndex]?.icon" class="text-red-500 text-sm" />
            <span class="font-medium">{{ techMenu[curMenuIndex]?.title || '选择功能' }}</span>
          </div>
          <DownOutlined class="text-slate-400 text-xs" />
        </a-button>

        <template #overlay>
          <a-menu class="min-w-[200px]">
            <a-menu-item
              v-for="(menu, index) in techMenu"
              :key="menu.key"
              @click="() => handleMenuChange(index)"
              :class="{ '!bg-red-50 !text-red-600': index === curMenuIndex }"
            >
              <div class="flex items-center space-x-2">
                <component :is="menu.icon" class="text-base" />
                <span>{{ menu.title }}</span>
              </div>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- 对话列表 -->
    <div class="flex-1 overflow-hidden scrollbar-thin scrollbar-thumb-red-200 scrollbar-track-red-50 flex flex-col">
      <div class="flex items-center justify-between mb-4 p-4 border-b-c">
        <div class="flex items-center gap-2">
          <MessageOutlined class="text-red-500 text-base" />
          <span class="text-sm font-semibold text-slate-600">最近对话</span>
        </div>
        <a-button
          size="small"
          type="link"
          danger
          class="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-2"
          @click="createNewChat"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          新增
        </a-button>
      </div>

      <div class="space-y-4 flex-1 overflow-y-auto px-4 pb-4">
        <div
          v-for="conversation in conversationList"
          :key="conversation.key"
          :class="[
            'relative flex items-center overflow-hidden justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 shadow-md',
            'hover:bg-red-50 hover:border-red-200 hover:shadow-lg hover: text-orange-600 hover:scale-105',
            conversation.key === activeConversationKey
              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-0 shadow-lg scale-105'
              : 'bg-white/60 border-red-100'
          ]"
          @click="handleConversationChange(conversation.key)"
        >
          <!-- 左侧激活状态指示器 -->
          <div
            :class="[
              'absolute left-0 top-0 bottom-0 w-1 rounded-r-md transition-transform duration-300',
              'bg-gradient-to-b from-orange-300 to-orange-500',
              conversation.key === activeConversationKey ? 'scale-y-100' : 'scale-y-0'
            ]"
          ></div>

          <div class="flex-1 min-w-0 pr-3">
            <div
              :class="[
                'text-sm font-medium mb-1 line-clamp-1 leading-5',
                conversation.key === activeConversationKey
                  ? 'text-orange-600 font-semibold'
                  : 'text-slate-600'
              ]"
            >
              {{ conversation.label }}
            </div>
            <div class="text-xs text-orange-300 font-normal">
              {{ formatTime(conversation.timestamp) }}
            </div>
          </div>

          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-3">
            <a-dropdown
              :trigger="['click']"
              placement="bottomRight"
              @click.stop
            >
              <a-button
                type="text"
                size="small"
                class="w-7 h-7 flex items-center justify-center border-0 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition-all duration-300 hover:scale-110"
              >
                <template #icon>
                  <SettingOutlined class="text-xs" />
                </template>
              </a-button>
              <template #overlay>
                <a-menu @click="(e) => handleMenuClick(e, conversation.key)">
                  <a-menu-item key="delete" class="text-red-600 hover:bg-red-50">
                    <DeleteOutlined class="mr-2" />
                    删除对话
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部用户信息 -->
    <div class="px-5 py-4 border-t border-red-100/50 bg-gradient-to-br from-orange-50 via-red-50 to-pink-100">
      <div class="flex items-center">
        <div class="text-xl text-red-600 mr-3 bg-red-100 rounded-xl p-2">
          <UserOutlined />
        </div>
        <div>
          <div class="text-base font-semibold text-slate-700">法律顾问</div>
          <div class="text-xs text-green-500 font-medium flex items-center">
            <div class="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
            在线服务
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
