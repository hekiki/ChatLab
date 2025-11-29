<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DailyActivity, MemberActivity, MemberNameHistory } from '@/types/chat'
import dayjs from 'dayjs'
import { LineChart } from '@/components/charts'
import type { LineChartData } from '@/components/charts'
import { SectionCard, StatCard, EmptyState, LoadingState } from '@/components/UI'
import { formatPeriod } from '@/utils'

interface TimeFilter {
  startTs?: number
  endTs?: number
}

const props = defineProps<{
  sessionId: string
  dailyActivity: DailyActivity[]
  memberActivity: MemberActivity[]
  timeRange: { start: number; end: number } | null
  timeFilter?: TimeFilter
}>()

// 检测是否跨年
const isMultiYear = computed(() => {
  if (props.dailyActivity.length < 2) return false
  const years = new Set(props.dailyActivity.map((d) => dayjs(d.date).year()))
  return years.size > 1
})

// 每日趋势图数据
const dailyChartData = computed<LineChartData>(() => {
  const dateFormat = isMultiYear.value ? 'YYYY/MM/DD' : 'MM/DD'
  return {
    labels: props.dailyActivity.map((d) => dayjs(d.date).format(dateFormat)),
    values: props.dailyActivity.map((d) => d.messageCount),
  }
})

// 最活跃的一天
const peakDay = computed(() => {
  if (!props.dailyActivity.length) return null
  return props.dailyActivity.reduce((max, d) => (d.messageCount > max.messageCount ? d : max), props.dailyActivity[0])
})

// 平均每日消息数
const avgDailyMessages = computed(() => {
  if (!props.dailyActivity.length) return 0
  const total = props.dailyActivity.reduce((sum, d) => sum + d.messageCount, 0)
  return Math.round(total / props.dailyActivity.length)
})

// 活跃天数
const activeDays = computed(() => {
  return props.dailyActivity.filter((d) => d.messageCount > 0).length
})

// 总天数
const totalDays = computed(() => {
  if (!props.timeRange) return 0
  const start = dayjs.unix(props.timeRange.start)
  const end = dayjs.unix(props.timeRange.end)
  return end.diff(start, 'day') + 1
})

// 活跃率
const activeRate = computed(() => {
  return totalDays.value > 0 ? Math.round((activeDays.value / totalDays.value) * 100) : 0
})

// ==================== 昵称变更记录 ====================
interface MemberWithHistory {
  memberId: number
  name: string
  history: MemberNameHistory[]
}

const membersWithNicknameChanges = ref<MemberWithHistory[]>([])
const isLoadingHistory = ref(false)

async function loadMembersWithNicknameChanges() {
  if (!props.sessionId || props.memberActivity.length === 0) return

  isLoadingHistory.value = true
  const membersWithChanges: MemberWithHistory[] = []

  try {
    const historyPromises = props.memberActivity.map((member) =>
      window.chatApi.getMemberNameHistory(props.sessionId, member.memberId)
    )

    const allHistories = await Promise.all(historyPromises)

    props.memberActivity.forEach((member, index) => {
      const history = allHistories[index]
      if (history.length > 1) {
        membersWithChanges.push({
          memberId: member.memberId,
          name: member.name,
          history,
        })
      }
    })

    membersWithNicknameChanges.value = membersWithChanges
  } catch (error) {
    console.error('加载昵称变更记录失败:', error)
  } finally {
    isLoadingHistory.value = false
  }
}

watch(
  () => [props.sessionId, props.memberActivity.length],
  () => {
    loadMembersWithNicknameChanges()
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">时间轴分析</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">追踪群聊的活跃趋势变化</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="最活跃日期"
        :value="peakDay ? dayjs(peakDay.date).format('MM/DD') : '-'"
        :subtext="`${peakDay?.messageCount ?? 0} 条消息`"
      />
      <StatCard label="日均消息" :value="avgDailyMessages" subtext="条/天" />
      <StatCard label="活跃天数" :value="activeDays" :subtext="`/ ${totalDays} 天`" />
      <StatCard label="活跃率" :value="`${activeRate}%`" subtext="有消息的天数占比" />
    </div>

    <!-- 每日趋势 -->
    <SectionCard title="每日消息趋势" :show-divider="false">
      <div class="p-5">
        <LineChart :data="dailyChartData" :height="288" />
      </div>
    </SectionCard>

    <!-- 昵称变更记录 -->
    <SectionCard
      title="昵称变更记录"
      :description="
        isLoadingHistory
          ? '加载中...'
          : membersWithNicknameChanges.length > 0
            ? `${membersWithNicknameChanges.length} 位成员曾修改过昵称`
            : '暂无成员修改昵称'
      "
    >
      <div
        v-if="!isLoadingHistory && membersWithNicknameChanges.length > 0"
        class="divide-y divide-gray-100 dark:divide-gray-800"
      >
        <div
          v-for="member in membersWithNicknameChanges"
          :key="member.memberId"
          class="flex items-start gap-3 px-5 py-3"
        >
          <div class="w-32 shrink-0 pt-0.5 font-medium text-gray-900 dark:text-white">
            {{ member.name }}
          </div>

          <div class="flex flex-1 flex-wrap items-center gap-2">
            <template v-for="(item, index) in member.history" :key="index">
              <div class="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
                <span
                  class="text-sm"
                  :class="item.endTs === null ? 'font-semibold text-pink-600' : 'text-gray-700 dark:text-gray-300'"
                >
                  {{ item.name }}
                </span>
                <UBadge v-if="item.endTs === null" color="primary" variant="soft" size="xs">当前</UBadge>
                <span class="text-xs text-gray-400">({{ formatPeriod(item.startTs, item.endTs) }})</span>
              </div>

              <span v-if="index < member.history.length - 1" class="text-gray-300 dark:text-gray-600">→</span>
            </template>
          </div>
        </div>
      </div>

      <EmptyState v-else-if="!isLoadingHistory" text="该群组所有成员均未修改过昵称" />

      <LoadingState v-else text="正在加载昵称变更记录..." />
    </SectionCard>
  </div>
</template>
