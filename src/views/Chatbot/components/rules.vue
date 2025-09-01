<script setup lang="ts">
import Office from './Office/index.vue'
import { ref,computed } from "vue";
import { ClockCircleOutlined } from "@ant-design/icons-vue";
  const props = withDefaults(
   defineProps<{
     ruleList: any[]
     file: any
   }>(),
   {
      ruleList: () => []
   }
  )

  const isSelectAll = ref<boolean>(false)
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
</script>

<template>
  <div class="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
    <div class="col-span-1 h-full overflow-hidden flex flex-col">
      <div class="text-sm text-orange-500 p-4">
        <ClockCircleOutlined /><span class="pl-2 font-semibold italic">{{ file?.name }}</span>
      </div>
      <div class="flex-1 overflow-hidden bg-[#757575] p-4">
        <Office :fileUrl="file?.originFileObj" />
      </div>
    </div>
    <div class="col-span-1 h-full p-4 flex flex-col overflow-hidden">
      <div class="bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 px-4 py-2 rounded-lg">
        <a-checkbox
          v-model:checked="isSelectAll"
          @change="selectAllChange"
        >已选择 {{ checkedList.length }}/ {{ props?.ruleList?.length }} 项</a-checkbox>
      </div>
      <div class="flex-1 overflow-y-auto pl-4 ">
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
  </div>
</template>

<style scoped lang="scss">

</style>