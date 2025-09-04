<script setup lang="ts">
import { computed,ref } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
const props = withDefaults(
  defineProps<{
    data: any
  }>(),
  {
    data: null
  }
)
const defaultRiskLevelKey = ref<string>('high')

const RISK_LEVELS = {
  'high': '高风险',
  'medium': '中风险',
  'low': '低风险',
  'normal': '通过'
}

const SUB_RISK_KEY = [
  {key:'riskBrief',label: '风险点'},
  {key:'originalContent',label: '原文'},
  {key:'resultContent',label: '优化建议'},
]

const groupByRiskLevel = computed(() => {
  if (!props?.data?.result || !Array.isArray(props?.data?.result)) {
    return {}
  }
  return props.data?.result?.reduce((acc: any, rule: any) => {
    const level = rule.riskLevel || '未知风险'
    if (!acc[level]) {
      acc[level] = []
    }
    acc[level].push({...rule, subRiskKey: 0})
    return acc
  }, {})
})

const subRiskKeys = ref<Record<number, number>>({})

const curRiskLevel = computed(() => groupByRiskLevel.value?.[defaultRiskLevelKey.value] ?? [])

const riskItemTabClick = (key: string, riskIndex: number) => {
  subRiskKeys.value[riskIndex] = parseInt(key)
}
const getActiveKey = (riskIndex: number) => {
  return subRiskKeys.value[riskIndex] ?? 0
}

</script>

<template>
  <div class="col-span-1 flex-1 px-4 pb-4 flex flex-col overflow-hidden risk-box">
    <div class="grid grid-cols-4 gap-x-2 bg-white pb-4">
      <div
        class="col-span-1 h-[30px] rounded-md bg-orange-50 inline-flex items-center justify-center text-xs hover:font-semibold hover:bg-orange-100 hover:shadow-md transition-all duration-200 cursor-pointer"
        :class="defaultRiskLevelKey === key ? 'bg-orange-100 font-semibold shadow-md scale-105' : ''"
        @click="defaultRiskLevelKey = key"
        v-for="(val,key) in RISK_LEVELS"
        :key="key"
      >{{ val }}({{ groupByRiskLevel[key]?.length ?? 0 }})</div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <template v-if="!!curRiskLevel.length">
        <a-collapse :bordered="false" style="background-color: #fff">
          <a-collapse-panel
          v-for="(risk,idx) in curRiskLevel"
          :key="idx"
          style="margin-bottom: 10px;border: none;background: linear-gradient(180deg, #fdf5ee 0%,#fdf5ee 100%);border-radius: 8px"
        >
          <template #header>
            <div class="text-ellipsis whitespace-nowrap overflow-hidden">
              {{ idx + 1 }}. {{ risk?.ruleTitle }}
            </div>
          </template>
          <template #extra v-if="!!risk?.subRisks?.[0]?.resultContent">
            <div class="rounded-[50%] bg-gray-100 w-[20px] h-[20px] text-xs text-center leading-[20px]">{{ risk?.subRisks?.length ?? 0 }}</div>
          </template>
          <div>
            <div class="p-2 bg-white text-xs leading-5 space-y-2 rounded-md">{{ risk?.examineBrief }}</div>
            <div class="px-4 pb-4 bg-white text-xs leading-5 space-y-2 rounded-md mt-4" v-if="!!risk?.subRisks?.[0]?.resultContent">
              <a-tabs
                tab-position="top"
                :activeKey="getActiveKey(idx)"
                @tabClick="(key) => riskItemTabClick(key, idx)"
              >
                <a-tab-pane
                  v-for="(subRisk,subIdx) in risk?.subRisks ?? []"
                  :tab="`风险点${subIdx + 1}`"
                  :key="subIdx"
                >
                  <div
                    class="p-2 leading-6 mt-2 bg-cyan-50 text-xs first:mt-0"
                    v-for="(subRiskKey, skIdx) in SUB_RISK_KEY"
                    :key="skIdx"
                  >
                    <div class="font-semibold">{{ subRiskKey.label }}</div>
                    <div>{{ subRisk?.[subRiskKey.key] }}</div>
                  </div>
                </a-tab-pane>
              </a-tabs>
            </div>
          </div>
        </a-collapse-panel>
        </a-collapse>
      </template>
      <div v-else class="pt-[10vh]">
        <a-empty description="暂无风险点"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.risk-box{
  ::v-deep(.ant-collapse-header-text){
    max-width: calc(100% - 22px - 30px);
  }
}
</style>