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
   ruleList: any[]
   file: any
 }>(),
 {
    ruleList: () => []
 }
)

const params = reactive({
  position: '1'
})

const isSelectAll = ref<boolean>(false)
const activeStep = ref<number>(0)
const loading = ref<boolean>(false)
const result = ref<any>(null)

const checkedList = computed({
  get: () => {
    const checkedList = props?.ruleList.filter((item) => item.checked == 1)
    isSelectAll.value = checkedList?.length == props.ruleList?.length
    return checkedList
  },
  set: (value) => {
    isSelectAll.value = value.length === props?.ruleList?.length
    props.ruleList.forEach((item) => {
      item.checked = value.includes(item) ? 1 : 0
    })
  },
})

const selectAllChange = () => {
  checkedList.value = !!isSelectAll.value ? [...props?.ruleList] : []
}
const generate = () => {
  loading.value = true
  aiService.post('/chat/farui/contract/result/generate',{
    assistant: {
      metaData: {
        fileId: props?.file?.fileId,
        position: params.position,
        ruleTaskId: props?.file?.ruleTaskId,
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
  if (step == 1) {
    result.value = null
  }
  if (step == 2) {
    generate()
  }
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
      tip="正在生成审查结果,请稍候..."
      wrapper-class-name="h-full overflow-hidden"
    >
      <div class="p-4">
        <a-steps
          size="small"
          v-model:current="activeStep"
          @change="stepChange"
          :items="[
            {title: '审查方式'},
            {title: '审查清单'},
            {title: '审查结果'}
          ]"
        />
      </div>
      <div class="col-span-1 h-full px-4 pb-4 flex flex-col overflow-hidden" v-if="activeStep == 0">
        <div class="pt-4">
          <div class="font-semibold mb-2">审查立场</div>
          <a-radio-group v-model:value="params.position">
            <a-radio value="1">甲方立场</a-radio>
            <a-radio value="2">乙方立场</a-radio>
            <a-radio value="0">中立立场</a-radio>
          </a-radio-group>
        </div>
      </div>
      <div class="col-span-1 h-full px-4 pb-4 flex flex-col overflow-hidden" v-if="!result && activeStep == 1">
        <div class="bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 pl-4 py-2 rounded-lg flex items-center justify-between">
          <a-checkbox
            v-model:checked="isSelectAll"
            @change="selectAllChange"
          >已选择 {{ checkedList.length }}/ {{ props?.ruleList?.length }} 项</a-checkbox>
          <a-button type="link" class="ml-auto" @click="generate">生成审查结果</a-button>
        </div>
        <div class="flex-1 overflow-y-auto pl-4">
          <a-checkbox-group
            class="w-full mt-4 flex flex-col gap-3"
            style="width: 100%"
            v-model:value="checkedList"
          >
            <a-checkbox
              v-for="(rule, index) in ruleList"
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
        v-else
        :data="result && activeStep == 2"
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