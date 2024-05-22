<template>
  <div>
    this is pageA
    <button @click="handleClick">back to home</button>
    <PageB ref="localConfBarRef" />
  </div>
  <components-bar ref="componentsBarRef" />
</template>

<script setup>
  import { ref, reactive, provide, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import mitt from 'mitt'
  import PageB from './PageB.vue'
  import ComponentsBar from './ComponentsBar.vue'
  const router = useRouter()

  const localConfBarRef = ref(null)

  const emitter = mitt()
  provide('emitter', emitter)

  // 模板状态 1、edit编辑 2、preview预览 3、apply应用
  const status = ref(1)
  provide('status', status)

  const statusManagement = {
    getPageStatus: () => status.value,
    getConfPageStatus: () => localConfBarRef.value.localConfBarStatus()
  }
  provide('statusManagement', statusManagement)

  const templateData = reactive(
    {
      nodes: new Map(),
      nodeMappings: new Map([['top', []]]),
      nodesSelection: new Set()
    }
  )
  provide('templateData', templateData)


  const UUID_SYMBOL = Symbol('uuid')
  provide('UUID_SYMBOL', UUID_SYMBOL)

  const pressKeys = ref(new Set())
  provide('pressKeys', pressKeys)

  // nodes管理对象
  const nodesManagement = {
    // 组件是否已存在
    isExist: (uuid) => templateData.nodes.has(uuid),
    // 插入组件
    insert: (uuid, value) => templateData.nodes.set(uuid, value),
    // 根据UPDATE_FIELDS更新组件属性
    update(uuid, value) {
      Object.assign(
        templateData.nodes.get(uuid),
        value
      )
    },
    // 移除组件
    delete(uuid) { templateData.nodes.delete(uuid) },
    // 移除组件属性
    deleteProp(uuid, prop) {
      delete templateData.nodes.get(uuid)[prop]
    },
    // 清空组件
    clear() { templateData.nodes.clear() },
    // 获取组件字段
    get(uuid, fields) {
      const node = templateData.nodes.get(uuid)

      if (!node) {
        return {}
      }

      if (fields === 'nodeStyle') {
        const style = node[fields]
        return style && Object.assign(
          {},
          {
            ...style,
            parentDisplay: nodesManagement.get(node.parentUUID, 'nodeStyle')?.display || []
          }
        )
      }

      if (typeof fields === 'string') {
        return node[fields]
      }
      if (
        !Array.isArray(fields) ||
        fields.length === 0
      ) {
        return { ...node }
      }
      // 否则返回对应字段，如果对应字段不在组件信息中，则不返回
      const res = {}
      fields.forEach(field => {
        field in node && (res[field] = node[field])
      })
      return res
    },
    // 获取组件所有祖先组件
    getAllParents(uuid, parentUUIDList = []) {
      const parentUUID = this.get(uuid, 'parentUUID')
      parentUUIDList.unshift(parentUUID)
      if (parentUUID === 'top') {
        return parentUUIDList
      }
      return this.getAllParents(parentUUID, parentUUIDList)
    }
  }
  provide('nodesManagement', nodesManagement)

  const nodeMappingsManagement = {
    // 获取容器组件下的所有直接子组件uuid
    getDirectChildren: (uuid) => templateData.nodeMappings.get(uuid),
    // 获取容器组件下的所有直接子组件数量
    getDirectChildrenCount: function (uuid) {
      return this.getDirectChildren(uuid).length
    },
    // 获取容器组件下所有（容器）子组件uuid
    getAllChildContainers: function(uuid, filterContainer = false) {
      console.log(this.getDirectChildren(uuid))
      return this.getDirectChildren(uuid).reduce((list, item) => {
        list.push(
          ...(
            templateData.nodeMappings.has(item) &&
            [item, ...this.getAllChildContainers(item, filterContainer)] ||
            [item].slice(0, ~~!filterContainer)
          )
        )
        return list
      }, [])
    },
    // 获取容器组件下所有（容器）子组件uuid
    getAllChildContainersByData: function(uuid, data, filterContainer = false) {
      return data.get(uuid).reduce((list, item) => {
        list.push(
          ...(
            data.has(item) &&
            [item, ...this.getAllChildContainersByData(item, data, filterContainer)] ||
            [item].slice(0, ~~!filterContainer)
          )
        )
        return list
      }, [])
    },
    /**
     * 以树形结构获取所有节点
     * @param {String} containerUUID 父节点唯一标识（容器节点）
     * @param {Array} handledArr 已处理过的父节点组合
     */
    getAllInTree: function(containerUUID = 'top') {
      const children = this.getDirectChildren(containerUUID).map(item => {
        return {
          uuid: item,
          label: item,
          value: item,
          isContainer: true,
          children: templateData.nodeMappings.has(item) ? this.getAllInTree(item) : []
        }
      })
      if (containerUUID === 'top') {
        return [
          {
            children,
            uuid: 'top',
            label: 'top',
            value: 'top',
            isContainer: true,
          }
        ]
      }
      return children
    },
    // getDirectChildrenCount: (uuid) => templateData.nodeMappings.get(uuid).length,
    // 获取父组件uuid及子组件在父组件中的偏移
    get: (uuid) => {
      const info = {}
      for (const [parentUUID, children] of templateData.nodeMappings) {
        const offset = children.findIndex(item => item === uuid)
        if (offset !== -1) {
          Object.assign(
            info,
            {
              parentUUID,
              offset
            }
          )
          break
        }
      }
      return info
    },

  }
  provide('nodeMappingsManagement', nodeMappingsManagement)

  const nodesSelectionManagement = {
    add: (uniMark) => templateData.nodesSelection.add(uniMark),
    remove: (uniMark) => templateData.nodesSelection.delete(uniMark),
    size: () => templateData.nodesSelection.size,
    includes: (uniMark) => templateData.nodesSelection.has(uniMark),
    list: () => Array.from(templateData.nodesSelection.values()),
    clear: () => templateData.nodesSelection.clear()
  }
  provide('nodesSelectionManagement', nodesSelectionManagement)

  const draggingNodeManagement = {
    init: () => ({
      // 组件uuid
      [UUID_SYMBOL]: '',
      // 组件名称
      nodeName: '',
      // 父组件uuid
      parentUUID: null,
      // 组件上一父组件uuid
      originalParentUUID: null,
      // 组件在当前父组件的位置
      offset: null,
      // 组件在上一父组件的原始位置
      originalOffset: null,
      // 是否容器
      // isContainer: false,
      // 组件是否已被放置到目标组件
      // isDropped: false,
      // 是否在元素自身移动
      isOnSelf: false,
      // 拖拽来源 1、组件栏 2、已有组件
      // source: 1,
      // // 组件样式
      // style: {},
      // // 组件的更新类型 1、新增 2、移动 3、删除
      // type: 1,
      // 组件uuid是否校验成功
      // validated: false,
      showLogs: false
    }),
    update: (val) => Object.assign(draggingNodeInfo, val),
    clear: () => Object.assign(draggingNodeInfo, draggingNodeManagement.init()),
    getFields: (fields = []) => {
      // 如果fields是字符串
      if (typeof fields === 'string') {
        if (fields === 'uuid') {
          return draggingNodeInfo[UUID_SYMBOL]
        }
        // 如果存在于拖拽组件临时信息对象中，则返回对应字段
        if (fields in draggingNodeInfo) {
          return draggingNodeInfo[fields]
        }
        // 如果存在于拖拽组件原始信息对象中，则返回对应字段
        if (fields in templateData.nodes.get(draggingNodeInfo.uuid)) {
          return templateData.nodes.get(draggingNodeInfo.uuid)[fields]
        }
        return undefined
      }
      // 如果fields不是数组或是数组且长度为0，返回拖拽组件信息所有字段
      if (
        !Array.isArray(fields) ||
        fields.length === 0
      ) {
        return {
          ...draggingNodeInfo,
          uuid: draggingNodeInfo[UUID_SYMBOL]
        }
      }
      // 否则返回对应字段，如果对应字段不在拖拽组件信息中，则不返回
      const res = {}
      fields.forEach(item => {
        const field = item === 'uuid' && UUID_SYMBOL || item
        field in draggingNodeInfo && (res[item] = draggingNodeInfo[field])
      })
      return res
    }
  }

  provide('draggingNodeManagement', draggingNodeManagement)

  // 正在拖拽的组件信息
  const draggingNodeInfo = reactive(draggingNodeManagement.init())

  // 待应用的操作日志
  const redoLogs = ref([])
  provide('redoLogs', redoLogs)

  // 已撤销的操作日志
  const undoLogs = ref([])
  provide('undoLogs', undoLogs)

  function eventTransmissionController(eventRow) {

    const { type } = eventRow
    // eventFrom：drag、configure
    if (
      type === 'compress' ||
      ['save', 'cancel'].includes(type)
    ) {
      return false
    }
  }

  provide('eventTransmissionController', eventTransmissionController)

  provide(
    'allAttrs',
    {
      emitter,
      status,
      statusManagement,
      templateData,
      UUID_SYMBOL,
      pressKeys,
      nodesManagement,
      nodeMappingsManagement,
      nodesSelectionManagement,
      draggingNodeManagement,
      eventTransmissionController,
      redoLogs,
      undoLogs
    }
  )

  function handleClick() {
    router.push('/')
  }


</script>

<style scoped lang='less'>

</style>
