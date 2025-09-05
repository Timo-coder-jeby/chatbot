<script setup lang="ts">
import Office from '../Office/index.vue'
import ResultComp from './Result.vue'

import { ref,computed,inject,reactive } from "vue";
import { ClockCircleOutlined } from "@ant-design/icons-vue";
import type {IAIService} from "@/services/aiService.ts";
import { message } from "ant-design-vue";
const aiService = inject<IAIService>('aiService')!

const props = withDefaults(
  defineProps<{
   file: any
  }>(),{
    file: null
  }
)

const params = reactive({
  position: '1',
  bargaining: '1', // 1-强势 2-弱势 3-均势
})

const ruleList = reactive<any>({
  ruleTaskId: '',
  rules: []
})
const isSelectAll = ref<boolean>(false)
const activeStep = ref<number>(0)
const loading = ref<boolean>(false)
const result = ref<any>(null)

const getRules = () => {
  loading.value = true
  aiService.post('/chat/farui/contract/rule/generate',{
    assistant: {
      metaData: {
        fileId: props?.file?.fileId,
        position: params.position
      }
    }
  })
    .then(res => {
      ruleList.ruleTaskId = res?.output?.ruleTaskId
      ruleList.rules = res?.output?.rules?.map((vo:any) => ({...vo,checked: 1})) ?? []
      activeStep.value = 1
    })
    .catch(_ => message.warning('生成审查清单失败,请稍后再试!'))
    .finally(() => loading.value = false)
}


const checkedList = computed({
  get: () => {
    const checkedList = ruleList?.rules.filter((item) => item.checked == 1)
    isSelectAll.value = checkedList?.length == ruleList?.rules.length
    return checkedList
  },
  set: (value) => {
    isSelectAll.value = value.length === ruleList?.rules?.length
    ruleList.rules.forEach((item) => {
      item.checked = value.includes(item) ? 1 : 0
    })
  },
})

const selectAllChange = () => {
  checkedList.value = !!isSelectAll.value ? [...ruleList?.rules] : []
}
const generate = () => {
  loading.value = true
  aiService.post('/chat/farui/contract/result/generate',{
    assistant: {
      metaData: {
        fileId: props?.file?.fileId,
        position: params.position,
        ruleTaskId: ruleList?.ruleTaskId,
        rules: checkedList?.value ?? []
      }
    }
  })
    .then(res => {
      if (res?.code == 200) {
        result.value = res?.data ?? null
        activeStep.value = 2
      }
    })
    .catch(_ => message.warning('生成审查结果失败,请稍后再试!'))
    .finally(() => {
      loading.value = false
    })
}

const stepChange = (step: number) => {
  switch (step) {
    case 0:
      activeStep.value = step
      result.value = null
      ruleList.ruleTaskId = ''
      ruleList.rules = []
      checkedList.value = []
      break
    case 1:
      activeStep.value = step
      result.value = null
      getRules()
      break
    case 2:
      if (!checkedList.value?.length) {
        message.warning('还未生成审查清单,请先生成审查清单!')
        return
      }
      generate()
      break
  }
  // if (step == 0) {
  //   activeStep.value = step
  //   result.value = null
  //   ruleList.ruleTaskId = ''
  //   ruleList.rules = []
  //   checkedList.value = []
  // }
  // if (step == 1) {
  //   activeStep.value = step
  //   result.value = null
  //   getRules()
  // }
  // if (step == 2) {
  //   if (!checkedList.value?.length) return
  //   generate()
  // }
}

</script>

<template>
  <div class="flex-1 grid grid-cols-2 gap-4 overflow-hidden rules-box relative">
    <div class="w-[1px] h-full absolute top-0 left-1/2 translate-x-1.5 bg-gray-200"></div>
    <div class="col-span-1 h-full overflow-hidden flex flex-col">
      <div class="text-sm text-orange-500 p-4">
        <ClockCircleOutlined /><span class="pl-2 font-semibold italic">{{ file?.name }}</span>
      </div>
      <div class="flex-1 overflow-hidden bg-[#757575] p-4">
        <Office :fileUrl="file?.originFileObj" />
      </div>
    </div>
    <a-spin
      :spinning="loading"
      tip="审查分析中,请稍候..."
      wrapper-class-name="h-full overflow-hidden"
    >
      <div class="p-4 bg-gradient-to-br from-orange-50 via-red-50 to-pink-100">
        <a-steps
          size="small"
          :current="activeStep"
          @change="stepChange"
          :items="[
            {title: '审查方式'},
            {title: '审查清单'},
            {title: '审查结果'}
          ]"
        />
      </div>
      <div class="col-span-1 h-full px-4 pb-4 flex flex-col overflow-hidden" v-if="activeStep == 0">
        <div class="pt-8 pl-8">
          <div class="font-semibold mb-2">审查立场</div>
          <a-radio-group v-model:value="params.position">
            <a-radio value="1">甲方立场</a-radio>
            <a-radio value="2">乙方立场</a-radio>
            <a-radio value="0">中立立场</a-radio>
          </a-radio-group>
        </div>
        <div class="m-[10vh_auto]">
          <a-button type="primary" class="ml-auto" @click="getRules">生成审查清单</a-button>
        </div>
      </div>
      <div
        class="col-span-1 h-full px-4 pb-4 flex flex-col overflow-hidden"
        v-if="!result && activeStep == 1"
      >
        <div class="pl-4 py-2 rounded-lg flex items-center justify-between border-b-c">
          <a-checkbox
            v-model:checked="isSelectAll"
            @change="selectAllChange"
          >已选择 {{ checkedList.length }}/ {{ ruleList?.rules?.length }} 项</a-checkbox>
          <a-button type="link" class="ml-auto" @click="generate">生成审查结果</a-button>
        </div>
        <div class="flex-1 overflow-y-auto pl-4">
          <a-checkbox-group
            class="w-full mt-4 flex flex-col gap-3"
            style="width: 100%"
            v-model:value="checkedList"
          >
            <a-checkbox
              v-for="(rule, index) in ruleList.rules"
              :key="index"
              :value="rule"
              class="flex items-center"
            >
              <div class="max-w-[calc((100vw-285px-220px)/2)] overflow-hidden text-ellipsis whitespace-nowrap">
                {{ rule.ruleSequence }} {{ rule?.ruleTitle }}
              </div>
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </div>
      <ResultComp
        v-if="activeStep == 2"
        :data="result"
      />
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.rules-box {
  ::v-deep(.ant-spin-nested-loading){
    height: 100%;
    overflow: hidden;
    .ant-spin-container{
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  }
  ::v-deep(.ant-spin-blur) {
    opacity: .2;
  }
}
</style>