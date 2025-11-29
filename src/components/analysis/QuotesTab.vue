<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LaughAnalysis, KeywordTemplate as BaseKeywordTemplate, CatchphraseAnalysis } from '@/types/chat'
import { ListPro } from '@/components/charts'
import type { RankItem } from '@/components/charts'
import { SectionCard, EmptyState, LoadingState } from '@/components/UI'
import { useChatStore } from '@/stores/chat'

interface TimeFilter {
  startTs?: number
  endTs?: number
}

// 扩展基础模板类型，添加组件内使用的字段
interface KeywordTemplate extends BaseKeywordTemplate {
  description?: string
  isCustom?: boolean
}

const props = defineProps<{
  sessionId: string
  timeFilter?: TimeFilter
}>()

// 使用类型断言绕过 Pinia persist 插件的类型推断问题
const chatStore = useChatStore() as ReturnType<typeof useChatStore> & {
  customKeywordTemplates: BaseKeywordTemplate[]
  addCustomKeywordTemplate: (template: BaseKeywordTemplate) => void
  updateCustomKeywordTemplate: (id: string, updates: Partial<Omit<BaseKeywordTemplate, 'id'>>) => void
  removeCustomKeywordTemplate: (id: string) => void
}

// 关键词颜色池（使用完整类名以支持 Tailwind 扫描）
const KEYWORD_COLORS = [
  { bg: 'bg-amber-400', text: 'text-amber-700', badge: 'amber' as const, wrapBg: 'bg-amber-50 dark:bg-amber-900/20' },
  { bg: 'bg-pink-400', text: 'text-pink-700', badge: 'pink' as const, wrapBg: 'bg-pink-50 dark:bg-pink-900/20' },
  { bg: 'bg-blue-400', text: 'text-blue-700', badge: 'blue' as const, wrapBg: 'bg-blue-50 dark:bg-blue-900/20' },
  { bg: 'bg-green-400', text: 'text-green-700', badge: 'green' as const, wrapBg: 'bg-green-50 dark:bg-green-900/20' },
  {
    bg: 'bg-purple-400',
    text: 'text-purple-700',
    badge: 'purple' as const,
    wrapBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  { bg: 'bg-red-400', text: 'text-red-700', badge: 'red' as const, wrapBg: 'bg-red-50 dark:bg-red-900/20' },
  { bg: 'bg-cyan-400', text: 'text-cyan-700', badge: 'cyan' as const, wrapBg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  {
    bg: 'bg-orange-400',
    text: 'text-orange-700',
    badge: 'orange' as const,
    wrapBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
]

// 获取关键词对应的颜色
function getKeywordColor(keyword: string) {
  const index = currentKeywords.value.indexOf(keyword)
  return KEYWORD_COLORS[index % KEYWORD_COLORS.length]
}

// 预设模板
const PRESET_TEMPLATES: KeywordTemplate[] = [
  {
    id: 'laugh',
    name: '含笑量',
    keywords: ['哈哈', 'xswl', 'lol', 'ww', '笑死', '233'],
    description: '统计群内的快乐指数',
  },
  {
    id: 'sad',
    name: '沮丧量',
    keywords: ['想死', '难受', '哭了', '崩溃', '裂开', '无语', '累了'],
    description: '统计群内的负面情绪',
  },
]

// 合并预设和自定义模板
const allTemplates = computed<KeywordTemplate[]>(() => {
  const custom = chatStore.customKeywordTemplates.map((t) => ({
    ...t,
    isCustom: true,
  }))
  return [...PRESET_TEMPLATES, ...custom]
})

// 当前选中的模板
const selectedTemplateId = ref<string>('laugh')

// 当前关键词（可编辑）
const currentKeywords = ref<string[]>([...PRESET_TEMPLATES[0].keywords])

// 分析结果
const analysis = ref<LaughAnalysis | null>(null)
const isLoading = ref(false)
const rankMode = ref<'rate' | 'count'>('count')

// ==================== 口头禅分析 ====================
const catchphraseAnalysis = ref<CatchphraseAnalysis | null>(null)
const isLoadingCatchphrase = ref(false)

async function loadCatchphraseAnalysis() {
  if (!props.sessionId) return
  isLoadingCatchphrase.value = true
  try {
    catchphraseAnalysis.value = await window.chatApi.getCatchphraseAnalysis(props.sessionId, props.timeFilter)
  } catch (error) {
    console.error('加载口头禅分析失败:', error)
  } finally {
    isLoadingCatchphrase.value = false
  }
}

function truncateContent(content: string, maxLength = 30): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}
// ====================================================

// 模板弹窗（创建/编辑）
const showTemplateModal = ref(false)
const editingTemplateId = ref<string | null>(null) // null = 创建模式，有值 = 编辑模式
const templateName = ref('')
const templateKeywords = ref<string[]>([])

// 是否编辑模式
const isEditMode = computed(() => editingTemplateId.value !== null)
const modalTitle = computed(() => (isEditMode.value ? '编辑模板' : '创建模板'))

// 打开创建模板弹窗
function openCreateModal() {
  editingTemplateId.value = null
  templateName.value = ''
  templateKeywords.value = []
  showTemplateModal.value = true
}

// 打开编辑模板弹窗
function openEditModal(template: KeywordTemplate) {
  editingTemplateId.value = template.id
  templateName.value = template.name
  templateKeywords.value = [...template.keywords]
  showTemplateModal.value = true
}

// 模板添加关键词
function addTemplateKeyword(keyword: string) {
  const trimmed = keyword.trim()
  if (trimmed && !templateKeywords.value.includes(trimmed)) {
    templateKeywords.value = [...templateKeywords.value, trimmed]
  }
}

// 模板删除关键词
function removeTemplateKeyword(keyword: string) {
  templateKeywords.value = templateKeywords.value.filter((k) => k !== keyword)
}

// 选择模板
function selectTemplate(template: KeywordTemplate) {
  selectedTemplateId.value = template.id
  currentKeywords.value = [...template.keywords]
  loadAnalysis()
}

// 清空所有关键词
function clearAllKeywords() {
  currentKeywords.value = []
  analysis.value = null
}

// 添加关键词
function addKeyword(keyword: string) {
  const trimmed = keyword.trim()
  if (trimmed && !currentKeywords.value.includes(trimmed)) {
    currentKeywords.value = [...currentKeywords.value, trimmed]
    loadAnalysis()
  }
}

// 删除关键词
function removeKeyword(keyword: string) {
  currentKeywords.value = currentKeywords.value.filter((k) => k !== keyword)
  loadAnalysis()
}

// 判断是否为预设模板
function isPresetTemplate(templateId: string): boolean {
  return PRESET_TEMPLATES.some((t) => t.id === templateId)
}

// 保存模板（创建或更新）
function saveTemplate() {
  if (!templateName.value.trim()) return

  if (isEditMode.value && editingTemplateId.value) {
    // 编辑模式
    if (isPresetTemplate(editingTemplateId.value)) {
      // 编辑预设模板 → 创建新的自定义模板覆盖
      const newTemplate = {
        id: `custom_${Date.now()}`,
        name: templateName.value.trim(),
        keywords: [...templateKeywords.value],
      }
      chatStore.addCustomKeywordTemplate(newTemplate)
      // 选中新模板
      selectedTemplateId.value = newTemplate.id
      currentKeywords.value = [...newTemplate.keywords]
      loadAnalysis()
    } else {
      // 更新现有自定义模板
      chatStore.updateCustomKeywordTemplate(editingTemplateId.value, {
        name: templateName.value.trim(),
        keywords: [...templateKeywords.value],
      })
      // 如果正在使用该模板，更新当前关键词
      if (selectedTemplateId.value === editingTemplateId.value) {
        currentKeywords.value = [...templateKeywords.value]
        loadAnalysis()
      }
    }
  } else {
    // 创建模式：添加新模板
    const newTemplate = {
      id: `custom_${Date.now()}`,
      name: templateName.value.trim(),
      keywords: [...templateKeywords.value],
    }
    chatStore.addCustomKeywordTemplate(newTemplate)
    // 选中新模板并应用其关键词
    selectedTemplateId.value = newTemplate.id
    currentKeywords.value = [...newTemplate.keywords]
    loadAnalysis()
  }

  showTemplateModal.value = false
}

// 删除自定义模板
function deleteTemplate(templateId: string) {
  chatStore.removeCustomKeywordTemplate(templateId)
  if (selectedTemplateId.value === templateId) {
    selectTemplate(PRESET_TEMPLATES[0])
  }
}

// 加载分析数据
async function loadAnalysis() {
  if (!props.sessionId || currentKeywords.value.length === 0) {
    analysis.value = null
    return
  }

  isLoading.value = true
  try {
    analysis.value = await window.chatApi.getLaughAnalysis(props.sessionId, props.timeFilter, [
      ...currentKeywords.value,
    ])
  } catch (error) {
    console.error('加载词频分析失败:', error)
    analysis.value = null
  } finally {
    isLoading.value = false
  }
}

// 扩展的排行数据类型
interface ExtendedRankItem extends RankItem {
  keywordDistribution: Array<{ keyword: string; count: number; percentage: number }>
}

// 排行榜数据
const rankData = computed<ExtendedRankItem[]>(() => {
  if (!analysis.value) return []
  const data = rankMode.value === 'rate' ? analysis.value.rankByRate : analysis.value.rankByCount
  return data.map((m) => ({
    id: m.memberId.toString(),
    name: m.name,
    value: rankMode.value === 'rate' ? m.laughRate : m.laughCount,
    percentage: rankMode.value === 'rate' ? m.laughRate : m.percentage,
    keywordDistribution: m.keywordDistribution || [],
  }))
})

// 相对百分比计算（第一名100%）
function getRelativePercentage(index: number): number {
  if (rankData.value.length === 0) return 0
  const maxValue = rankData.value[0].value
  if (maxValue === 0) return 0
  return Math.round((rankData.value[index].value / maxValue) * 100)
}

// 获取关键词分布的堆叠宽度数据
function getStackedWidths(
  member: ExtendedRankItem,
  index: number
): Array<{ keyword: string; width: number; bg: string }> {
  const relativePercent = getRelativePercentage(index)
  if (!member.keywordDistribution || member.keywordDistribution.length === 0) {
    return [{ keyword: 'default', width: relativePercent, bg: 'bg-amber-400' }]
  }
  return member.keywordDistribution.map((kd) => ({
    keyword: kd.keyword,
    width: (kd.percentage / 100) * relativePercent,
    bg: getKeywordColor(kd.keyword).bg,
  }))
}

// 监听 sessionId 和 timeFilter 变化
watch(
  () => [props.sessionId, props.timeFilter],
  () => {
    loadAnalysis()
    loadCatchphraseAnalysis()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="space-y-6">
    <!-- 口头禅分析模块 -->
    <LoadingState v-if="isLoadingCatchphrase" text="正在分析口头禅数据..." />

    <ListPro
      v-else-if="catchphraseAnalysis && catchphraseAnalysis.members.length > 0"
      :items="catchphraseAnalysis.members"
      title="💬 口头禅分析"
      :description="`分析了 ${catchphraseAnalysis.members.length} 位成员的高频发言`"
      countTemplate="共 {count} 位成员"
    >
      <template #item="{ item: member }">
        <div class="flex items-start gap-4">
          <div class="w-28 shrink-0 pt-1 font-medium text-gray-900 dark:text-white">
            {{ member.name }}
          </div>

          <div class="flex flex-1 flex-wrap items-center gap-2">
            <div
              v-for="(phrase, index) in member.catchphrases"
              :key="index"
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              :class="
                index === 0
                  ? 'bg-amber-50 dark:bg-amber-900/20'
                  : index === 1
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'bg-gray-50 dark:bg-gray-800/50'
              "
            >
              <span
                class="text-sm"
                :class="
                  index === 0 ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                "
                :title="phrase.content"
              >
                {{ truncateContent(phrase.content, 20) }}
              </span>
              <span class="text-xs text-gray-400">{{ phrase.count }}次</span>
            </div>
          </div>
        </div>
      </template>
    </ListPro>

    <SectionCard v-else title="💬 口头禅分析">
      <EmptyState text="暂无口头禅数据" />
    </SectionCard>

    <!-- 模板选择 + 关键词（合并为紧凑布局） -->
    <SectionCard title="关键词配置">
      <div class="p-4">
        <!-- 模板选择行 -->
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">模板:</span>
          <UContextMenu
            v-for="template in allTemplates"
            :key="template.id"
            :items="
              template.isCustom
                ? [
                    [
                      { label: '编辑', icon: 'i-lucide-pencil', onSelect: () => openEditModal(template) },
                      {
                        label: '删除',
                        icon: 'i-lucide-trash',
                        color: 'error' as const,
                        onSelect: () => deleteTemplate(template.id),
                      },
                    ],
                  ]
                : [[{ label: '编辑', icon: 'i-lucide-pencil', onSelect: () => openEditModal(template) }]]
            "
          >
            <button
              class="rounded-md border px-2.5 py-1 text-sm transition-all"
              :class="
                selectedTemplateId === template.id
                  ? 'border-pink-500 bg-pink-50 text-pink-600 dark:border-pink-400 dark:bg-pink-900/20 dark:text-pink-400'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
              "
              @click="selectTemplate(template)"
            >
              {{ template.name }}
            </button>
          </UContextMenu>

          <!-- 新建/编辑模板弹窗 -->
          <UModal v-model:open="showTemplateModal">
            <button
              class="rounded-md border border-dashed border-gray-300 px-2.5 py-1 text-sm text-gray-500 transition-all hover:border-pink-400 hover:text-pink-500 dark:border-gray-600"
              @click="openCreateModal"
            >
              + 新建
            </button>
            <template #content>
              <div class="p-4">
                <h3 class="mb-3 font-semibold text-gray-900 dark:text-white">{{ modalTitle }}</h3>
                <div class="space-y-3">
                  <div>
                    <label class="mb-1 block text-xs text-gray-500">模板名称</label>
                    <UInput v-model="templateName" placeholder="如：正能量" size="sm" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-gray-500">关键词</label>
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge
                        v-for="keyword in templateKeywords"
                        :key="keyword"
                        color="amber"
                        variant="soft"
                        class="cursor-pointer"
                        @click="removeTemplateKeyword(keyword)"
                      >
                        {{ keyword }}
                        <span class="ml-0.5 hover:text-red-500">×</span>
                      </UBadge>
                      <input
                        type="text"
                        class="min-w-24 rounded-md border border-gray-200 bg-transparent px-2 py-1 text-sm outline-none focus:border-pink-400 dark:border-gray-700"
                        placeholder="添加关键词..."
                        @keydown.enter.prevent="
                          (e) => {
                            const input = e.target as HTMLInputElement
                            addTemplateKeyword(input.value)
                            input.value = ''
                          }
                        "
                      />
                    </div>
                  </div>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                  <UButton size="sm" color="gray" variant="soft" @click="showTemplateModal = false">取消</UButton>
                  <UButton
                    size="sm"
                    color="primary"
                    :disabled="!templateName.trim() || templateKeywords.length === 0"
                    @click="saveTemplate"
                  >
                    {{ isEditMode ? '更新' : '保存' }}
                  </UButton>
                </div>
              </div>
            </template>
          </UModal>
        </div>

        <!-- 关键词编辑行 -->
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            v-for="keyword in currentKeywords"
            :key="keyword"
            :color="getKeywordColor(keyword).badge"
            variant="soft"
            class="cursor-pointer"
            @click="removeKeyword(keyword)"
          >
            {{ keyword }}
            <span class="ml-0.5 hover:text-red-500">×</span>
          </UBadge>
          <input
            type="text"
            class="min-w-24 rounded-md border border-gray-200 bg-transparent px-2 py-1 text-sm outline-none focus:border-pink-400 dark:border-gray-700"
            placeholder="添加关键词..."
            @keydown.enter.prevent="
              (e) => {
                const input = e.target as HTMLInputElement
                addKeyword(input.value)
                input.value = ''
              }
            "
          />
          <button
            v-if="currentKeywords.length > 0"
            class="text-xs text-gray-400 hover:text-red-500"
            @click="clearAllKeywords"
          >
            清空
          </button>
        </div>
        <div class="mt-1.5 text-xs text-gray-400">* 右键可编辑模板或删除</div>
      </div>
    </SectionCard>

    <!-- 分析结果 -->
    <SectionCard
      title="分析结果"
      :description="
        isLoading
          ? '加载中...'
          : analysis
            ? `共检测到 ${analysis.totalLaughs} 次关键词，群整体词频率 ${analysis.groupLaughRate}%`
            : '暂无数据'
      "
    >
      <template #headerRight>
        <div v-if="analysis && analysis.totalLaughs > 0" class="flex gap-1">
          <UButton
            size="xs"
            :variant="rankMode === 'count' ? 'solid' : 'ghost'"
            :color="rankMode === 'count' ? 'primary' : 'gray'"
            @click="rankMode = 'count'"
          >
            按次数
          </UButton>
          <UButton
            size="xs"
            :variant="rankMode === 'rate' ? 'solid' : 'ghost'"
            :color="rankMode === 'rate' ? 'primary' : 'gray'"
            @click="rankMode = 'rate'"
          >
            按词频率
          </UButton>
        </div>
      </template>

      <LoadingState v-if="isLoading" text="正在分析数据..." />

      <template v-else-if="analysis && analysis.totalLaughs > 0">
        <!-- 关键词类型分布（图例） -->
        <div
          v-if="analysis.typeDistribution.length > 0"
          class="border-b border-gray-100 px-5 py-4 dark:border-gray-800"
        >
          <div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">关键词分布</div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="item in analysis.typeDistribution"
              :key="item.type"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5"
              :class="getKeywordColor(item.type).wrapBg"
            >
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="getKeywordColor(item.type).bg" />
              <span class="font-medium" :class="getKeywordColor(item.type).text">{{ item.type }}</span>
              <span class="text-xs text-gray-500">{{ item.count }}次</span>
              <UBadge :color="getKeywordColor(item.type).badge" variant="soft" size="xs">{{ item.percentage }}%</UBadge>
            </div>
          </div>
        </div>

        <!-- 排行榜 -->
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="(member, index) in rankData.slice(0, 15)"
            :key="member.id"
            class="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <!-- 排名 -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              :class="
                index === 0
                  ? 'bg-linear-to-r from-amber-400 to-orange-500 text-white'
                  : index === 1
                    ? 'bg-linear-to-r from-gray-300 to-gray-400 text-white'
                    : index === 2
                      ? 'bg-linear-to-r from-amber-600 to-amber-700 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              "
            >
              {{ index + 1 }}
            </div>

            <!-- 名字 -->
            <div class="w-32 shrink-0">
              <p class="truncate font-medium text-gray-900 dark:text-white">
                {{ member.name }}
              </p>
            </div>

            <!-- 堆叠进度条 -->
            <div class="flex flex-1 items-center">
              <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  v-for="segment in getStackedWidths(member, index)"
                  :key="segment.keyword"
                  class="h-full transition-all first:rounded-l-full last:rounded-r-full"
                  :class="segment.bg"
                  :style="{ width: `${segment.width}%` }"
                  :title="`${segment.keyword}: ${segment.width.toFixed(1)}%`"
                />
              </div>
            </div>

            <!-- 数值和百分比 -->
            <div class="flex shrink-0 items-baseline gap-2">
              <span class="text-lg font-bold text-gray-900 dark:text-white">
                {{ member.value }}
              </span>
              <span class="text-sm text-gray-500">
                {{ rankMode === 'rate' ? '%' : `次 (${member.percentage}%)` }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <EmptyState v-else text="暂无数据，请检查关键词设置" />
    </SectionCard>
  </div>
</template>
