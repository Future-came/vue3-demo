<template>
  <div class="cascader-config__panel">
    <el-form :model="form" label-width="auto" label-position="top">
      <h4>属性</h4>
      <el-form-item label="字段名">
        <el-input v-model="form.fieldName" :placeholder="`默认：${componentData.fieldName}`"/>
      </el-form-item>
      <el-form-item label="数据源">
        <el-radio-group v-model="form.dataSource">
          <el-radio value="url">URL</el-radio>
          <el-radio value="json">JSON</el-radio>
        </el-radio-group>
        <div class="flex flex-jcfe w-100per">
          <el-input v-if="form.dataSource === 'url'" v-model="form.url" placeholder="请输入数据源URL"/>
          <el-button v-if="form.dataSource === 'json'" type="primary">编辑</el-button>
        </div>
      </el-form-item>
      <el-form-item label="尺寸">
        <el-select v-model="form.size" placeholder="请选择尺寸">
          <el-option label="大" value="large" />
          <el-option label="默认" value="default" />
          <el-option label="小" value="small" />
        </el-select>
      </el-form-item>
      <el-form-item label="占位文本">
        <el-input v-model="form.placeholder" placeholder="请输入占位文本"/>
      </el-form-item>
      <el-form-item label="是否禁用">
        <el-radio-group v-model="form.disabled">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否支持清空选项">
        <el-radio-group v-model="form.clearable">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否显示选中值的完整路径">
        <el-radio-group v-model="form['show-all-levels']">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="多选模式下是否折叠Tag">
        <el-radio-group v-model="form['collapse-tags']">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <template #label>
          当鼠标悬停于折叠标签的文本时，是否显示所有选中的标签
          <el-tooltip placement="bottom" effect="light">
            <template #content>只有当 多选模式下是否折叠Tag 设置<br />为是时才会生效。</template>
            <el-icon class="c-pointer" size="16"><Warning /></el-icon>
          </el-tooltip>
        </template>
        <el-radio-group v-model="form['collapse-tags-tooltip']">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="选项分隔符">
        <el-input v-model="form.separator" placeholder="默认值：' / '"/>
      </el-form-item>
      <el-form-item label="选项是否可以被搜索">
        <el-radio-group v-model="form.filterable">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
        <div class="flex flex-jcfe w-100per">
          <el-button v-if="form.filterable" type="primary">编辑</el-button>
        </div>
      </el-form-item>
      <el-form-item label="搜索关键词正在输入时的去抖延迟，单位为毫秒(ms)">
        <el-input-number
          v-model="form.debounce"
          :min="0"
          step-strictly
          controls-position="right"
          placeholder="默认值：300"
          style="width: 100%;"
        />
      </el-form-item>
      <el-form-item label="标签类型">
        <el-select v-model="form['tag-type']" placeholder="默认值：'info'">
          <el-option label="success" value="success" />
          <el-option label="info" value="info" />
          <el-option label="warning" value="warning" />
          <el-option label="danger" value="danger" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <template #label>
          需要显示的 Tag 的最大数量
          <el-tooltip placement="bottom" effect="light">
            <template #content>只有当 多选模式下是否折叠Tag 设置<br />为是时才会生效。</template>
            <el-icon class="c-pointer" size="16"><Warning /></el-icon>
          </el-tooltip>
        </template>
        <el-input-number
          v-model="form['max-collapse-tags']"
          :min="1"
          step-strictly
          controls-position="right"
          placeholder="默认值：1"
          style="width: 100%;"
        />
      </el-form-item>
      <h4>事件</h4>
      <div class="flex flex-fdc g-10">
        <div class="flex-common" v-for="(item, index) in componentsEvents" :key="index">
          <span>
            {{ item.name }}
            <el-tooltip placement="bottom" effect="light">
              <template #content>{{ item.desc }}</template>
              <el-icon class="c-pointer" size="16"><Warning /></el-icon>
            </el-tooltip>
          </span>
          <el-button type="primary">编辑</el-button>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup>
  import { onMounted, toRaw, reactive, toRefs, inject, watch } from 'vue'
  import { Warning } from '@element-plus/icons-vue'
  import { useDebounceFn } from '@vueuse/core'
  import { useRouter } from 'vue-router'

  const props = defineProps(['selectionUUID'])
  const { selectionUUID } = toRefs(props)

  const eventTransmissionController = inject('eventTransmissionController')
  const nodesManagement = inject('nodesManagement')

  const router = useRouter()

  const form = reactive({})

  const componentsEvents = [
    {
      name: 'change',
      desc: '当绑定值变化时触发的事件'
    },
    {
      name: 'expand-change',
      desc: '当展开节点发生变化时触发'
    },
    {
      name: 'blur',
      desc: '当失去焦点时触发'
    },
    {
      name: 'focus',
      desc: '当获得焦点时触发'
    },
    {
      name: 'visible-change',
      desc: '下拉框出现/隐藏时触发'
    },
    {
      name: 'remove-tag',
      desc: '在多选模式下，移除Tag时触发'
    }
  ]

  const componentData = reactive({})

  watch(
    form,
    useDebounceFn(
      val => {
        eventTransmissionController({
          type: 'update',
          fields: ['nodes'],
          data: [{ config: { ...toRaw(val) } }],
          updatingNode: {
            uuid: selectionUUID.value
          }
        })
      },
      300
    ),
    {
      deep: true
    }
  )

  onMounted(() => {
    console.log('lalalalalal')
    const {
      fieldName,
      config = {}
    } = nodesManagement.get(selectionUUID.value)

    Object.assign(
      componentData,
      {
        fieldName
      }
    )

    Object.assign(
      form,
      {
        ...config
      }
    )
  })

  defineExpose({
    lalalal: 'lalfad'
  })
</script>

<style scoped lang='less'>
.cascader-config__panel {
  h4 {
    font-weight: 700;
  }
}
</style>
