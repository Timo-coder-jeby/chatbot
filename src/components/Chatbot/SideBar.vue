<script setup lang="ts">
import robotImg from "@/assets/icons/robots.png";
import { type ConversationItem } from '@/services/aiService.ts'

import {
  DeleteOutlined,
  MessageOutlined,
  PlusOutlined,
  SettingOutlined,
  UserOutlined
} from "@ant-design/icons-vue";

type Props = {
  conversationList: ConversationItem[];
  activeConversationKey: string;
}

defineProps<Props>()

// 定义事件
const emit = defineEmits<{
  'create-new-chat': []
  'conversation-change': [key: string]
  'delete-conversation': [key: string]
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
  <div class="sidebar">
    <!-- 顶部品牌区域 -->
    <div class="sidebar-brand">
      <div class="brand-logo">
        <span class="brand-text">CLOUDATA LEGAL SYS AI</span>
      </div>
    </div>

    <!-- 新建对话按钮 -->
    <div class="sidebar-header">
      <a-button type="primary" @click="createNewChat" block class="new-chat-btn">
        <template #icon>
          <PlusOutlined />
        </template>
        新建对话
      </a-button>
    </div>

    <!-- 对话列表 -->
    <div class="conversations-wrapper">
      <div class="conversations-title">
        <MessageOutlined />
        <span>最近对话</span>
      </div>

      <div class="conversations-list">
        <div
            v-for="conversation in conversationList"
            :key="conversation.key"
            :class="['conversation-item', { 'active': conversation.key === activeConversationKey }]"
            @click="handleConversationChange(conversation.key)"
        >
          <div class="conversation-content">
            <div class="conversation-title">{{ conversation.label }}</div>
            <div class="conversation-time">{{ formatTime(conversation.timestamp) }}</div>
          </div>
          <div class="conversation-actions">
            <a-dropdown
                :trigger="['click']"
                placement="bottomRight"
                @click.stop
            >
              <a-button type="text" size="small" class="action-btn">
                <template #icon>
                  <SettingOutlined />
                </template>
              </a-button>
              <template #overlay>
                <a-menu @click="(e) => handleMenuClick(e, conversation.key)">
                  <a-menu-item key="delete" class="danger-item">
                    <DeleteOutlined />
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
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          <UserOutlined />
        </div>
        <div class="user-details">
          <div class="user-name">用户</div>
          <div class="user-status">在线</div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.sidebar {
  grid-column: 1;
  grid-row: 1;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  border-radius: 24px;
  box-shadow:
      0 8px 32px rgba(99, 102, 241, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;

  &-brand {
    display: flex;
    align-items: center;
    padding: 20px 20px 16px 20px;
    border-bottom: 1px solid rgba(99, 102, 241, 0.08);

    .brand-logo {
      display: flex;
      align-items: center;

      .logo-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        padding: 8px;
        background: rgba(99, 102, 241, 0.1);
        margin-right: 4px;
        box-shadow:
            0 8px 32px rgba(99, 102, 241, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .brand-text {
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }

  &-header {
    padding: 20px;
    border-bottom: 1px solid rgba(99, 102, 241, 0.08);

    :deep(.ant-btn-primary) {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 16px;
      height: 48px;
      font-weight: 600;
      font-size: 15px;
      box-shadow:
          0 4px 16px rgba(99, 102, 241, 0.3),
          0 1px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow:
            0 8px 24px rgba(99, 102, 241, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .conversations-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px;

    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(99, 102, 241, 0.05);
      border-radius: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.2);
      border-radius: 6px;

      &:hover {
        background: rgba(99, 102, 241, 0.3);
      }
    }

    .conversations-title {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 12px 16px 12px;
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;

      .anticon {
        font-size: 16px;
        color: #6366f1;
      }
    }

    .conversations-list {
      .conversation-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        margin-bottom: 8px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(99, 102, 241, 0.08);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transform: scaleY(0);
          transition: transform 0.3s ease;
          border-radius: 0 4px 4px 0;
        }

        &:hover {
          background: rgba(99, 102, 241, 0.05);
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.15);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);

          .conversation-actions {
            opacity: 1;
          }
        }

        &.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);

          &::before {
            transform: scaleY(1);
          }

          .conversation-content {
            .conversation-title {
              color: #334155;
              font-weight: 600;
            }
          }
        }

        .conversation-content {
          flex: 1;
          min-width: 0;

          .conversation-title {
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
          }

          .conversation-time {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 400;
          }
        }

        .conversation-actions {
          opacity: 0;
          transition: opacity 0.3s ease;
          margin-left: 12px;

          .action-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 8px;
            color: #6366f1;
            transition: all 0.3s ease;

            &:hover {
              background: rgba(99, 102, 241, 0.15);
              color: #4f46e5;
              transform: scale(1.1);
            }

            .anticon {
              font-size: 12px;
            }
          }
        }
      }
    }
  }

  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid rgba(99, 102, 241, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(248, 250, 252, 0.8);
    border-radius: 0 0 24px 24px;

    .user-info {
      display: flex;
      align-items: center;

      .user-avatar {
        font-size: 20px;
        line-height: 20px;
        color: #6366f1;
        margin-right: 12px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 12px;
        padding: 8px;
      }

      .user-details {
        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: #334155;
        }

        .user-status {
          font-size: 12px;
          color: #22c55e;
          font-weight: 500;
        }
      }
    }
  }
}

</style>
