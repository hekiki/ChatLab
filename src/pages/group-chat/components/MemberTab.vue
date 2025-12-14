<script setup lang="ts">
import { ref } from 'vue'
import { SubTabs } from '@/components/UI'
import MemberList from './member/MemberList.vue'
import NicknameHistory from './member/NicknameHistory.vue'
import Relationships from './member/Relationships.vue'

interface TimeFilter {
  startTs?: number
  endTs?: number
}

// Props
const props = defineProps<{
  sessionId: string
  timeFilter?: TimeFilter
}>()

// Emits
const emit = defineEmits<{
  'data-changed': []
}>()

// 子 Tab 配置
const subTabs = [
  { id: 'list', label: '成员列表', icon: 'i-heroicons-users' },
  { id: 'relationships', label: '群关系', icon: 'i-heroicons-heart' },
  { id: 'history', label: '昵称变更', icon: 'i-heroicons-clock' },
]

const activeSubTab = ref('list')

function handleDataChanged() {
  emit('data-changed')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 子 Tab 导航 -->
    <SubTabs v-model="activeSubTab" :items="subTabs" persist-key="memberTab" />

    <!-- 子 Tab 内容 -->
    <div class="flex-1 min-h-0 overflow-auto">
      <Transition name="fade" mode="out-in">
        <!-- 成员列表 -->
        <MemberList v-if="activeSubTab === 'list'" :session-id="props.sessionId" @data-changed="handleDataChanged" />

        <!-- 群关系 -->
        <Relationships
          v-else-if="activeSubTab === 'relationships'"
          :session-id="props.sessionId"
          :time-filter="props.timeFilter"
        />

        <!-- 昵称变更记录 -->
        <NicknameHistory v-else-if="activeSubTab === 'history'" :session-id="props.sessionId" />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
