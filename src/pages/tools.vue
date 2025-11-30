<script setup lang="ts">
import { ref } from 'vue'
import MergeTab from '@/components/tools/MergeTab.vue'

// Tab 配置
const tabs = [{ id: 'merge', label: '合并聊天记录', icon: 'i-heroicons-document-duplicate' }]

const activeTab = ref('merge')
</script>

<template>
  <div class="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">工具广场</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">提供聊天记录处理的实用工具</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
          :class="[
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          ]"
          @click="activeTab = tab.id"
        >
          <UIcon :name="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-auto p-6">
      <MergeTab v-if="activeTab === 'merge'" />
    </div>
  </div>
</template>
