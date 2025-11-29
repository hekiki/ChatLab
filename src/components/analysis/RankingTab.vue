<script setup lang="ts">
import { computed } from 'vue'
import type { MemberActivity } from '@/types/chat'
import { RankListPro } from '@/components/charts'
import type { RankItem } from '@/components/charts'
import { PageAnchorsNav } from '@/components/UI'
import { usePageAnchors } from '@/composables'
import DragonKingRank from './ranking/DragonKingRank.vue'
import MonologueRank from './ranking/MonologueRank.vue'
import RepeatSection from './ranking/RepeatSection.vue'
import DivingRank from './ranking/DivingRank.vue'
import NightOwlRank from './ranking/NightOwlRank.vue'

interface TimeFilter {
  startTs?: number
  endTs?: number
}

const props = defineProps<{
  sessionId: string
  memberActivity: MemberActivity[]
  timeFilter?: TimeFilter
}>()

// 锚点导航配置
const anchors = [
  { id: 'member-activity', label: '📊 成员活跃度' },
  { id: 'dragon-king', label: '🐉 龙王排名' },
  { id: 'monologue', label: '🎤 自言自语榜' },
  { id: 'diving', label: '🤿 潜水排名' },
  { id: 'repeat', label: '🔁 复读分析' },
  { id: 'night-owl', label: '🦉 修仙排行榜' },
]

// 使用锚点导航 composable
const { contentRef, activeAnchor, scrollToAnchor } = usePageAnchors(anchors)

// ==================== 成员活跃度排行 ====================
const memberRankData = computed<RankItem[]>(() => {
  return props.memberActivity.map((m) => ({
    id: m.memberId.toString(),
    name: m.name,
    value: m.messageCount,
    percentage: m.percentage,
  }))
})
</script>

<template>
  <div ref="contentRef" class="flex gap-6">
    <!-- 主内容区 -->
    <div class="min-w-0 flex-1 space-y-6">
      <!-- 成员活跃度排行 -->
      <div id="member-activity" class="scroll-mt-24">
        <RankListPro :members="memberRankData" title="成员活跃度排行" />
      </div>

      <!-- 龙王排名 -->
      <div id="dragon-king" class="scroll-mt-24">
        <DragonKingRank :session-id="sessionId" :time-filter="timeFilter" />
      </div>

      <!-- 自言自语榜 -->
      <div id="monologue" class="scroll-mt-24">
        <MonologueRank :session-id="sessionId" :time-filter="timeFilter" />
      </div>

      <!-- 潜水排名 -->
      <div id="diving" class="scroll-mt-24">
        <DivingRank :session-id="sessionId" :time-filter="timeFilter" />
      </div>

      <!-- 复读分析 -->
      <div id="repeat" class="scroll-mt-24">
        <RepeatSection :session-id="sessionId" :time-filter="timeFilter" />
      </div>

      <!-- 修仙排行榜 -->
      <div id="night-owl" class="scroll-mt-24">
        <NightOwlRank :session-id="sessionId" :time-filter="timeFilter" />
      </div>
    </div>

    <!-- 右侧锚点导航 -->
    <PageAnchorsNav :anchors="anchors" :active-anchor="activeAnchor" @click="scrollToAnchor" />
  </div>
</template>
