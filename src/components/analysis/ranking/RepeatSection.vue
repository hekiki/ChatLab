<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RepeatAnalysis } from '@/types/chat'
import { RankListPro, BarChart } from '@/components/charts'
import type { RankItem, BarChartData } from '@/components/charts'
import { SectionCard, EmptyState, LoadingState } from '@/components/UI'
import { formatDate, getRankBadgeClass } from '@/utils'

interface TimeFilter {
  startTs?: number
  endTs?: number
}

const props = defineProps<{
  sessionId: string
  timeFilter?: TimeFilter
}>()

const analysis = ref<RepeatAnalysis | null>(null)
const isLoading = ref(false)
const rankMode = ref<'count' | 'rate'>('rate')

async function loadData() {
  if (!props.sessionId) return
  isLoading.value = true
  try {
    analysis.value = await window.chatApi.getRepeatAnalysis(props.sessionId, props.timeFilter)
  } catch (error) {
    console.error('加载复读分析失败:', error)
  } finally {
    isLoading.value = false
  }
}

function truncateContent(content: string, maxLength = 30): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

const originatorRankData = computed<RankItem[]>(() => {
  if (!analysis.value) return []
  const data = rankMode.value === 'count' ? analysis.value.originators : analysis.value.originatorRates
  return data.map((m) => ({
    id: m.memberId.toString(),
    name: m.name,
    value: (m as any).count,
    percentage: rankMode.value === 'count' ? (m as any).percentage : (m as any).rate,
  }))
})

const initiatorRankData = computed<RankItem[]>(() => {
  if (!analysis.value) return []
  const data = rankMode.value === 'count' ? analysis.value.initiators : analysis.value.initiatorRates
  return data.map((m) => ({
    id: m.memberId.toString(),
    name: m.name,
    value: (m as any).count,
    percentage: rankMode.value === 'count' ? (m as any).percentage : (m as any).rate,
  }))
})

const breakerRankData = computed<RankItem[]>(() => {
  if (!analysis.value) return []
  const data = rankMode.value === 'count' ? analysis.value.breakers : analysis.value.breakerRates
  return data.map((m) => ({
    id: m.memberId.toString(),
    name: m.name,
    value: (m as any).count,
    percentage: rankMode.value === 'count' ? (m as any).percentage : (m as any).rate,
  }))
})

const chainLengthChartData = computed<BarChartData>(() => {
  if (!analysis.value) return { labels: [], values: [] }
  const distribution = analysis.value.chainLengthDistribution
  return {
    labels: distribution.map((d) => `${d.length}人`),
    values: distribution.map((d) => d.count),
  }
})

watch(
  () => [props.sessionId, props.timeFilter],
  () => loadData(),
  { immediate: true, deep: true }
)
</script>

<template>
  <SectionCard
    title="复读分析"
    :description="
      isLoading
        ? '加载中...'
        : analysis
          ? `共检测到 ${analysis.totalRepeatChains} 次复读，平均复读链长度 ${analysis.avgChainLength} 人`
          : '暂无复读数据'
    "
  >
    <template #headerRight>
      <UTabs
        v-if="analysis && analysis.totalRepeatChains > 0"
        v-model="rankMode"
        :items="[
          { label: '按复读率', value: 'rate' },
          { label: '按次数', value: 'count' },
        ]"
        size="xs"
      />
    </template>

    <LoadingState v-if="isLoading" text="正在分析复读数据..." />

    <div v-else-if="analysis && analysis.totalRepeatChains > 0" class="space-y-6 p-5">
      <!-- 复读链长度分布 & 最火复读内容 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- 复读链长度分布 -->
        <div class="rounded-lg border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/50">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">📊 复读链长度分布</h4>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">每次复读有多少人参与</p>
          </div>
          <div class="p-4">
            <BarChart v-if="chainLengthChartData.labels.length > 0" :data="chainLengthChartData" :height="200" />
            <EmptyState v-else padding="md" />
          </div>
        </div>

        <!-- 最长复读链 TOP 10 -->
        <div class="rounded-lg border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/50">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">🏆 最长复读链 TOP 10</h4>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">单次复读参与人数最多的内容</p>
          </div>
          <div v-if="analysis.hotContents.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="(item, index) in analysis.hotContents" :key="index" class="flex items-center gap-3 px-4 py-3">
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="getRankBadgeClass(index)"
              >
                {{ index + 1 }}
              </span>
              <span class="shrink-0 text-lg font-bold text-pink-600">{{ item.maxChainLength }}人</span>
              <div class="flex flex-1 items-center gap-1 overflow-hidden text-sm">
                <span class="shrink-0 font-medium text-gray-900 dark:text-white">{{ item.originatorName }}：</span>
                <span class="truncate text-gray-600 dark:text-gray-400" :title="item.content">
                  {{ truncateContent(item.content) }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                <span>{{ item.count }} 次</span>
                <span class="text-gray-300 dark:text-gray-600">|</span>
                <span>{{ formatDate(item.lastTs) }}</span>
              </div>
            </div>
          </div>
          <EmptyState v-else padding="md" />
        </div>
      </div>

      <!-- 复读排行榜 -->
      <RankListPro
        v-if="originatorRankData.length > 0"
        :members="originatorRankData"
        title="🎯 谁的聊天最容易产生复读"
        :description="rankMode === 'rate' ? '被复读次数 / 总发言数' : '发出的消息被别人复读的次数'"
        unit="次"
      />

      <RankListPro
        v-if="initiatorRankData.length > 0"
        :members="initiatorRankData"
        title="🔥 谁最喜欢挑起复读"
        :description="rankMode === 'rate' ? '挑起复读次数 / 总发言数' : '第二个发送相同消息、带起节奏的人'"
        unit="次"
      />

      <RankListPro
        v-if="breakerRankData.length > 0"
        :members="breakerRankData"
        title="✂️ 谁喜欢打断复读"
        :description="rankMode === 'rate' ? '打断复读次数 / 总发言数' : '终结复读链的人'"
        unit="次"
      />
    </div>

    <EmptyState v-else text="该群组暂无复读记录" />
  </SectionCard>
</template>
